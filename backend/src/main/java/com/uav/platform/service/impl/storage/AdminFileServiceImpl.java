package com.uav.platform.service.impl.storage;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.dto.request.storage.AdminFileQueryRequest;
import com.uav.platform.dto.response.storage.AdminFileDownloadResponse;
import com.uav.platform.dto.response.storage.AdminFileResponse;
import com.uav.platform.dto.response.storage.AdminFileSummaryResponse;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.storage.StoredFileKind;
import com.uav.platform.enums.storage.StoredFileModule;
import com.uav.platform.enums.storage.StoredFileStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.training.TrainingAssetRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.media.MediaAssetOperations;
import com.uav.platform.service.media.ObjectStorageService;
import com.uav.platform.service.storage.AdminFileService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Builds the file manager from the tables that record stored objects, in one SQL statement per request:
 *
 * <ul>
 *   <li>training_assets: lesson videos, slide images, PDFs/office files, course covers. IN_USE when a course
 *       cover, lesson video/document, slide or resource points at it; PENDING until the upload is confirmed.
 *   <li>media_assets (not deleted): mission media (linked to a mission or attached through mission_media),
 *       station/UAV/equipment files, avatars (users.avatar_url carries ?v={mediaId}) and unlinked uploads. A row
 *       used as an AI/KV260 task input (ai_tasks.media_id) is IN_USE too.
 * </ul>
 *
 * Assistant chat attachments live inline in the database (assistant_attachments.data), not in object storage,
 * so they are not listed.
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class AdminFileServiceImpl implements AdminFileService {
    /** Lifetime of the admin download link. */
    static final Duration DOWNLOAD_VALIDITY = Duration.ofMinutes(5);

    /**
     * Matches the training upload URL lifetime (TrainingCourseAdminServiceImpl.UPLOAD_VALIDITY): a PENDING
     * training file younger than this may still be uploading, and removing it could leave a late object behind.
     */
    static final Duration TRAINING_UPLOAD_WINDOW = Duration.ofMinutes(30);

    private static final String TRAINING = "TRAINING_ASSET";
    private static final String MEDIA = "MEDIA_ASSET";

    private static final String KIND =
            """
            CASE
              WHEN LOWER(f.content_type) LIKE 'video/%' THEN 'VIDEO'
              WHEN LOWER(f.content_type) LIKE 'image/%' THEN 'IMAGE'
              WHEN LOWER(f.content_type) LIKE 'application/pdf%'
                OR LOWER(f.content_type) LIKE 'text/%'
                OR LOWER(f.content_type) LIKE 'application/msword%'
                OR LOWER(f.content_type) LIKE 'application/rtf%'
                OR LOWER(f.content_type) LIKE 'application/vnd.ms-%'
                OR LOWER(f.content_type) LIKE 'application/vnd.openxmlformats-officedocument%'
                OR LOWER(f.content_type) LIKE 'application/vnd.oasis.opendocument%' THEN 'DOCUMENT'
              ELSE 'OTHER'
            END
            """;

    /**
     * Every stored file as one row set (file_rows). Each training asset and each live media asset appears once;
     * where several things use a file, the link names the first one (lowest id).
     */
    private static final String FILE_ROWS =
            """
            WITH training_usage AS (
              SELECT d.cover_asset_id AS asset_id, d.id AS course_id
                FROM training_documents d WHERE d.cover_asset_id IS NOT NULL
              UNION ALL
              SELECT l.video_asset_id, l.document_id FROM training_lessons l WHERE l.video_asset_id IS NOT NULL
              UNION ALL
              SELECT l.document_asset_id, l.document_id FROM training_lessons l WHERE l.document_asset_id IS NOT NULL
              UNION ALL
              SELECT s.asset_id, l.document_id
                FROM training_lesson_slides s JOIN training_lessons l ON l.id = s.lesson_id
              UNION ALL
              SELECT r.asset_id, l.document_id
                FROM training_lesson_resources r JOIN training_lessons l ON l.id = r.lesson_id
            ),
            training_link AS (
              SELECT asset_id, MIN(course_id) AS course_id FROM training_usage GROUP BY asset_id
            ),
            mission_link AS (
              SELECT media_id, MIN(mission_id) AS mission_id FROM mission_media GROUP BY media_id
            ),
            ai_link AS (
              SELECT media_id, MIN(mission_id) AS mission_id FROM ai_tasks
               WHERE media_id IS NOT NULL GROUP BY media_id
            ),
            avatar_link AS (
              SELECT y.id AS user_id, COALESCE(NULLIF(y.full_name, ''), y.username) AS user_label,
                     SUBSTRING(y.avatar_url, LENGTH(CONCAT('/api/v1/users/', y.id, '/avatar?v=')) + 1) AS media_key
                FROM users y
               WHERE y.avatar_url LIKE CONCAT('/api/v1/users/', y.id, '/avatar?v=%')
            ),
            media_files AS (
              SELECT a.id, a.original_name, a.content_type, a.size, a.object_key, a.uploaded_by, a.created_at,
                     a.confirmed,
                     CASE WHEN a.linked_entity_type = 'MISSION' OR ml.media_id IS NOT NULL THEN 'MISSION_MEDIA'
                          WHEN a.linked_entity_type = 'STATION' THEN 'STATION_MEDIA'
                          WHEN a.linked_entity_type = 'UAV' THEN 'UAV_MEDIA'
                          WHEN a.linked_entity_type = 'EQUIPMENT' THEN 'EQUIPMENT_MEDIA'
                          WHEN av.user_id IS NOT NULL THEN 'AVATAR'
                          ELSE 'UNLINKED' END AS module_name,
                     COALESCE(ml.mission_id, lm.id, al.mission_id) AS mission_id,
                     CASE WHEN ml.media_id IS NOT NULL OR al.media_id IS NOT NULL OR st.id IS NOT NULL
                            OR u.id IS NOT NULL OR eq.id IS NOT NULL OR av.user_id IS NOT NULL
                          THEN TRUE ELSE FALSE END AS referenced,
                     st.id AS station_id, st.name AS station_name,
                     u.id AS uav_id, CASE WHEN u.id IS NOT NULL THEN CONCAT(u.model, ' ', u.serial_number) END AS uav_label,
                     eq.id AS equipment_id, eq.name AS equipment_name,
                     av.user_id AS avatar_user_id, av.user_label AS avatar_label
                FROM media_assets a
                LEFT JOIN mission_link ml ON ml.media_id = a.id
                LEFT JOIN ai_link al ON al.media_id = a.id
                LEFT JOIN missions lm
                  ON a.linked_entity_type = 'MISSION' AND CAST(lm.id AS VARCHAR(80)) = a.linked_entity_id
                LEFT JOIN uav_stations st
                  ON a.linked_entity_type = 'STATION' AND CAST(st.id AS VARCHAR(80)) = a.linked_entity_id
                LEFT JOIN uavs u
                  ON a.linked_entity_type = 'UAV' AND CAST(u.id AS VARCHAR(80)) = a.linked_entity_id
                LEFT JOIN equipment eq
                  ON a.linked_entity_type = 'EQUIPMENT' AND CAST(eq.id AS VARCHAR(80)) = a.linked_entity_id
                LEFT JOIN avatar_link av
                  ON (a.linked_entity_type IS NULL OR a.linked_entity_type = '')
                 AND av.media_key = CAST(a.id AS VARCHAR(40))
               WHERE a.deleted = FALSE
            ),
            stored_files AS (
              SELECT 'TRAINING_ASSET' AS source, 'TRAINING' AS file_module, t.id AS db_id,
                     t.file_name AS file_name, t.content_type AS content_type, t.size_bytes AS size_bytes,
                     t.object_key AS storage_key, t.uploaded_by AS uploaded_by, t.created_at AS created_at,
                     CASE WHEN t.status <> 'READY' THEN 'PENDING'
                          WHEN tl.asset_id IS NOT NULL THEN 'IN_USE' ELSE 'UNUSED' END AS file_status,
                     CASE WHEN td.id IS NOT NULL THEN 'COURSE' END AS link_type,
                     td.id AS link_id, td.title AS link_label, td.slug AS link_slug
                FROM training_assets t
                LEFT JOIN training_link tl ON tl.asset_id = t.id
                LEFT JOIN training_documents td ON td.id = tl.course_id
              UNION ALL
              SELECT 'MEDIA_ASSET', mf.module_name, mf.id, mf.original_name, mf.content_type, mf.size,
                     mf.object_key, mf.uploaded_by, mf.created_at,
                     CASE WHEN mf.confirmed = FALSE THEN 'PENDING'
                          WHEN mf.referenced THEN 'IN_USE' ELSE 'UNUSED' END,
                     CASE mf.module_name
                       WHEN 'STATION_MEDIA' THEN CASE WHEN mf.station_id IS NOT NULL THEN 'STATION' END
                       WHEN 'UAV_MEDIA' THEN CASE WHEN mf.uav_id IS NOT NULL THEN 'UAV' END
                       WHEN 'EQUIPMENT_MEDIA' THEN CASE WHEN mf.equipment_id IS NOT NULL THEN 'EQUIPMENT' END
                       WHEN 'AVATAR' THEN 'USER'
                       ELSE CASE WHEN m.id IS NOT NULL THEN 'MISSION' END
                     END,
                     CASE mf.module_name
                       WHEN 'STATION_MEDIA' THEN mf.station_id
                       WHEN 'UAV_MEDIA' THEN mf.uav_id
                       WHEN 'EQUIPMENT_MEDIA' THEN mf.equipment_id
                       WHEN 'AVATAR' THEN mf.avatar_user_id
                       ELSE m.id
                     END,
                     CASE mf.module_name
                       WHEN 'STATION_MEDIA' THEN mf.station_name
                       WHEN 'UAV_MEDIA' THEN mf.uav_label
                       WHEN 'EQUIPMENT_MEDIA' THEN mf.equipment_name
                       WHEN 'AVATAR' THEN mf.avatar_label
                       ELSE m.code
                     END,
                     CAST(NULL AS VARCHAR(255))
                FROM media_files mf
                LEFT JOIN missions m ON m.id = mf.mission_id
            ),
            file_rows AS (
              SELECT f.*, {KIND} AS file_kind, ou.id AS owner_id,
                     COALESCE(NULLIF(ou.full_name, ''), ou.username, f.uploaded_by) AS owner_name
                FROM stored_files f
                LEFT JOIN users ou ON ou.username = f.uploaded_by
            )
            """
                    .replace("{KIND}", KIND);

    private static final Map<String, String> SORTS =
            Map.of(
                    "createdAt", "created_at",
                    "sizeBytes", "size_bytes",
                    "size", "size_bytes",
                    "fileName", "LOWER(file_name)");

    private final NamedParameterJdbcTemplate jdbc;
    private final JdbcTemplate plainJdbc;
    private final MediaAssetRepository mediaAssets;
    private final TrainingAssetRepository trainingAssets;
    private final ObjectStorageService storage;
    private final AuditLogService audit;

    public AdminFileServiceImpl(
            JdbcTemplate jdbc,
            MediaAssetRepository mediaAssets,
            TrainingAssetRepository trainingAssets,
            ObjectStorageService storage,
            AuditLogService audit) {
        this.plainJdbc = jdbc;
        this.jdbc = new NamedParameterJdbcTemplate(jdbc);
        this.mediaAssets = mediaAssets;
        this.trainingAssets = trainingAssets;
        this.storage = storage;
        this.audit = audit;
    }

    @Override
    public PageResponse<AdminFileResponse> list(
            AdminFileQueryRequest query, int page, int size, String sort) {
        PageRequest pageable = Pageables.of(page, size);
        MapSqlParameterSource params = new MapSqlParameterSource();
        String where = where(query, params);
        Long total =
                jdbc.queryForObject(
                        FILE_ROWS + "SELECT COUNT(*) FROM file_rows" + where, params, Long.class);
        params.addValue("limit", pageable.getPageSize());
        params.addValue("offset", pageable.getOffset());
        List<AdminFileResponse> content =
                jdbc.query(
                        FILE_ROWS
                                + "SELECT * FROM file_rows"
                                + where
                                + " ORDER BY "
                                + orderBy(sort)
                                + " LIMIT :limit OFFSET :offset",
                        params,
                        this::row);
        return PageResponse.from(new PageImpl<>(content, pageable, total == null ? 0 : total));
    }

    @Override
    public AdminFileSummaryResponse summary() {
        Map<StoredFileModule, long[]> modules = new EnumMap<>(StoredFileModule.class);
        Map<StoredFileKind, long[]> kinds = new EnumMap<>(StoredFileKind.class);
        long[] total = new long[2], unused = new long[2], pending = new long[2];
        jdbc.query(
                FILE_ROWS
                        + """
                        SELECT file_module, file_kind, file_status,
                               COUNT(*) AS files, COALESCE(SUM(size_bytes), 0) AS bytes
                          FROM file_rows GROUP BY file_module, file_kind, file_status
                        """,
                rs -> {
                    StoredFileModule module = StoredFileModule.valueOf(rs.getString("file_module"));
                    StoredFileKind kind = StoredFileKind.valueOf(rs.getString("file_kind"));
                    StoredFileStatus status = StoredFileStatus.valueOf(rs.getString("file_status"));
                    long count = rs.getLong("files"), bytes = rs.getLong("bytes");
                    long[] m = modules.computeIfAbsent(module, k -> new long[4]);
                    m[0] += count;
                    m[1] += bytes;
                    if (status == StoredFileStatus.UNUSED) m[2] += count;
                    if (status == StoredFileStatus.PENDING) m[3] += count;
                    long[] k = kinds.computeIfAbsent(kind, x -> new long[2]);
                    k[0] += count;
                    k[1] += bytes;
                    add(total, count, bytes);
                    if (status == StoredFileStatus.UNUSED) add(unused, count, bytes);
                    if (status == StoredFileStatus.PENDING) add(pending, count, bytes);
                });
        List<AdminFileSummaryResponse.ModuleTotal> byModule = new ArrayList<>();
        modules.forEach(
                (module, v) ->
                        byModule.add(
                                new AdminFileSummaryResponse.ModuleTotal(
                                        module, v[0], v[1], v[2], v[3])));
        List<AdminFileSummaryResponse.KindTotal> byKind = new ArrayList<>();
        kinds.forEach(
                (kind, v) -> byKind.add(new AdminFileSummaryResponse.KindTotal(kind, v[0], v[1])));
        List<AdminFileResponse> largest =
                jdbc.query(
                        FILE_ROWS
                                + "SELECT * FROM file_rows ORDER BY size_bytes DESC, created_at DESC,"
                                + " db_id DESC LIMIT 10",
                        new MapSqlParameterSource(),
                        this::row);
        return new AdminFileSummaryResponse(
                new AdminFileSummaryResponse.Total(total[0], total[1]),
                new AdminFileSummaryResponse.Total(unused[0], unused[1]),
                new AdminFileSummaryResponse.Total(pending[0], pending[1]),
                byModule,
                byKind,
                largest);
    }

    @Override
    @Transactional
    public AdminFileDownloadResponse downloadUrl(String id, String actor) {
        AdminFileResponse file = find(id);
        String url;
        try {
            url = storage.createSignedDownloadUrl(file.storageKey(), DOWNLOAD_VALIDITY);
        } catch (RuntimeException ex) {
            log.warn("Cannot sign admin download for {}: {}", file.id(), ex.getMessage());
            throw storageUnavailable();
        }
        audit.record(
                null, actor, AuditAction.DOWNLOAD, "STORED_FILE", file.id(), file.storageKey());
        return new AdminFileDownloadResponse(url, (int) DOWNLOAD_VALIDITY.toSeconds());
    }

    @Override
    @Transactional
    public void delete(String id, String actor) {
        AdminFileResponse file = find(id);
        requireDeletable(file);
        // Lock the record, then classify again: a lesson or mission may have taken the file
        // meanwhile.
        long dbId = dbId(file);
        if (file.module() == StoredFileModule.TRAINING)
            plainJdbc.queryForList(
                    "SELECT id FROM training_assets WHERE id = ? FOR UPDATE", Long.class, dbId);
        else mediaAssets.findByIdForUpdate(dbId);
        file = find(id);
        requireDeletable(file);

        if (file.module() == StoredFileModule.TRAINING) deleteTrainingAsset(file, dbId);
        else deleteMediaAsset(dbId);
        audit.record(
                null,
                actor,
                AuditAction.DELETE,
                "STORED_FILE",
                file.id(),
                file.status() + " " + file.storageKey());
    }

    /**
     * Training assets have no tombstone: the row goes first (so a foreign key from a slide or resource stops the
     * delete), then the object. If storage refuses, the transaction rolls back and the row stays.
     */
    private void deleteTrainingAsset(AdminFileResponse file, long dbId) {
        trainingAssets.deleteById(dbId);
        trainingAssets.flush();
        try {
            storage.deleteObject(file.storageKey());
        } catch (RuntimeException ex) {
            log.warn("Cannot delete training object {}: {}", file.storageKey(), ex.getMessage());
            throw storageUnavailable();
        }
    }

    /**
     * Media keeps its own lifecycle (V13): the row becomes a deletion tombstone and the media cleanup worker
     * re-checks the key later, so a signed upload that finishes late cannot leak an object. The object is
     * removed right away when no signed upload can still write it; otherwise the worker removes it.
     */
    private void deleteMediaAsset(long dbId) {
        var asset =
                mediaAssets
                        .findById(dbId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                notFoundMessage(), "FILE_NOT_FOUND"));
        LocalDateTime now = LocalDateTime.now();
        MediaAssetOperations.markDeleted(asset);
        MediaAssetOperations.queueDeletion(asset, now);
        if (!asset.getDeleteAfter().isAfter(now)) {
            try {
                storage.deleteObject(asset.getObjectKey());
                MediaAssetOperations.deletionSucceeded(asset, now);
            } catch (RuntimeException ex) {
                log.warn("Media object {} left for the cleanup worker", asset.getObjectKey());
                MediaAssetOperations.deletionFailed(asset, now);
            }
        }
        mediaAssets.save(asset);
    }

    private static void requireDeletable(AdminFileResponse file) {
        if (file.module() == StoredFileModule.MISSION_MEDIA)
            throw SystemException.conflict(
                    "Tệp nhiệm vụ chỉ được xem tại đây. Hãy xoá tệp trong trang nhiệm vụ.",
                    "FILE_MISSION_MEDIA_READ_ONLY");
        if (file.status() == StoredFileStatus.IN_USE)
            throw SystemException.conflict(
                    "Tệp đang được sử dụng"
                            + (file.linkedTo() != null && file.linkedTo().label() != null
                                    ? " bởi \"" + file.linkedTo().label() + "\""
                                    : "")
                            + ". Hãy gỡ tệp khỏi nơi đang dùng trước khi xoá.",
                    "FILE_IN_USE");
        if (!file.deletable())
            throw SystemException.conflict(
                    "Tệp vừa được đăng ký và có thể vẫn đang tải lên. Vui lòng thử lại sau 30 phút.",
                    "FILE_UPLOAD_IN_PROGRESS");
    }

    /** Resolves "MODULE:dbId" to the current row; a module that no longer matches the row is not found. */
    private AdminFileResponse find(String id) {
        String[] parts = id == null ? new String[0] : id.split(":", 2);
        StoredFileModule module;
        long dbId;
        try {
            if (parts.length != 2) throw new IllegalArgumentException(id);
            module = StoredFileModule.valueOf(parts[0]);
            dbId = Long.parseLong(parts[1]);
        } catch (IllegalArgumentException ex) {
            throw SystemException.notFound(notFoundMessage(), "FILE_NOT_FOUND");
        }
        List<AdminFileResponse> rows =
                jdbc.query(
                        FILE_ROWS
                                + "SELECT * FROM file_rows WHERE source = :source AND db_id = :id",
                        new MapSqlParameterSource()
                                .addValue(
                                        "source",
                                        module == StoredFileModule.TRAINING ? TRAINING : MEDIA)
                                .addValue("id", dbId),
                        this::row);
        return rows.stream()
                .filter(row -> row.module() == module)
                .findFirst()
                .orElseThrow(() -> SystemException.notFound(notFoundMessage(), "FILE_NOT_FOUND"));
    }

    private static String where(AdminFileQueryRequest query, MapSqlParameterSource params) {
        List<String> clauses = new ArrayList<>();
        if (query != null && query.module() != null) {
            clauses.add("file_module = :module");
            params.addValue("module", query.module().name());
        }
        if (query != null && query.type() != null) {
            clauses.add("file_kind = :kind");
            params.addValue("kind", query.type().name());
        }
        if (query != null && query.status() != null) {
            clauses.add("file_status = :status");
            params.addValue("status", query.status().name());
        }
        if (query != null && StringUtils.hasText(query.q())) {
            clauses.add(
                    "(LOWER(file_name) LIKE :q OR LOWER(storage_key) LIKE :q"
                            + " OR LOWER(COALESCE(link_label, '')) LIKE :q"
                            + " OR LOWER(COALESCE(owner_name, '')) LIKE :q)");
            params.addValue("q", "%" + escapeLike(query.q().trim().toLowerCase(Locale.ROOT)) + "%");
        }
        return clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses);
    }

    /** "field,direction" with an allow-listed field; anything else falls back to newest first. */
    static String orderBy(String sort) {
        String field = "createdAt", direction = "desc";
        if (StringUtils.hasText(sort)) {
            String[] parts = sort.split(",", 2);
            if (SORTS.containsKey(parts[0].trim())) field = parts[0].trim();
            if (parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim())) direction = "asc";
        }
        String column = SORTS.get(field);
        return column + " " + direction + ", source " + direction + ", db_id " + direction;
    }

    static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private AdminFileResponse row(ResultSet rs, int rowNum) throws SQLException {
        StoredFileModule module = StoredFileModule.valueOf(rs.getString("file_module"));
        StoredFileStatus status = StoredFileStatus.valueOf(rs.getString("file_status"));
        long dbId = rs.getLong("db_id");
        Timestamp created = rs.getTimestamp("created_at");
        LocalDateTime createdAt = created == null ? null : created.toLocalDateTime();
        long ownerId = rs.getLong("owner_id");
        boolean hasOwnerId = !rs.wasNull();
        String ownerName = rs.getString("owner_name");
        String linkType = rs.getString("link_type");
        long linkId = rs.getLong("link_id");
        boolean hasLinkId = !rs.wasNull();
        return new AdminFileResponse(
                module.name() + ":" + dbId,
                module,
                rs.getString("file_name"),
                rs.getString("content_type"),
                StoredFileKind.valueOf(rs.getString("file_kind")),
                rs.getLong("size_bytes"),
                rs.getString("storage_key"),
                ownerName == null
                        ? null
                        : new AdminFileResponse.Owner(hasOwnerId ? ownerId : null, ownerName),
                linkType == null
                        ? null
                        : new AdminFileResponse.LinkedTo(
                                linkType,
                                hasLinkId ? linkId : null,
                                rs.getString("link_label"),
                                rs.getString("link_slug")),
                status,
                deletable(module, status, createdAt, LocalDateTime.now()),
                createdAt);
    }

    static boolean deletable(
            StoredFileModule module,
            StoredFileStatus status,
            LocalDateTime createdAt,
            LocalDateTime now) {
        if (module == StoredFileModule.MISSION_MEDIA || status == StoredFileStatus.IN_USE)
            return false;
        // Media handles a late upload through its deletion tombstone; training assets have none.
        return module != StoredFileModule.TRAINING
                || status != StoredFileStatus.PENDING
                || createdAt == null
                || !createdAt.plus(TRAINING_UPLOAD_WINDOW).isAfter(now);
    }

    private static long dbId(AdminFileResponse file) {
        return Long.parseLong(file.id().substring(file.id().indexOf(':') + 1));
    }

    private static void add(long[] target, long count, long bytes) {
        target[0] += count;
        target[1] += bytes;
    }

    private static String notFoundMessage() {
        return "Không tìm thấy tệp.";
    }

    private static SystemException storageUnavailable() {
        return SystemException.serviceUnavailable(
                "Kho lưu trữ tệp chưa sẵn sàng. Vui lòng thử lại sau.", "FILE_STORAGE_UNAVAILABLE");
    }
}
