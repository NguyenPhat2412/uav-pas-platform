package com.uav.platform.service.impl.storage.pool;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.record.media.ObjectStream;
import com.uav.platform.dto.record.storage.files.CandidateRow;
import com.uav.platform.dto.record.storage.pool.DriveAboutInfo;
import com.uav.platform.dto.record.storage.pool.DriveUploadedFile;
import com.uav.platform.dto.record.storage.pool.OAuthAppCredentials;
import com.uav.platform.dto.request.storage.pool.GoogleOAuthAuthorizeRequest;
import com.uav.platform.dto.request.storage.pool.GoogleOAuthConfigRequest;
import com.uav.platform.dto.request.storage.pool.StorageDriveNodeCreateRequest;
import com.uav.platform.dto.request.storage.pool.StorageDriveNodeUpdateRequest;
import com.uav.platform.dto.request.storage.pool.StoragePoolPolicyRequest;
import com.uav.platform.dto.request.storage.pool.StorageR2MigrationRequest;
import com.uav.platform.dto.response.storage.pool.GoogleOAuthAuthorizeResponse;
import com.uav.platform.dto.response.storage.pool.StorageDriveNodeResponse;
import com.uav.platform.dto.response.storage.pool.StoragePoolOverviewResponse;
import com.uav.platform.dto.response.storage.pool.StorageR2MigrationResponse;
import com.uav.platform.entity.settings.SystemConfiguration;
import com.uav.platform.entity.storage.StorageDriveNode;
import com.uav.platform.entity.storage.StorageDriveObject;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.settings.SettingValueType;
import com.uav.platform.enums.storage.DriveAuthType;
import com.uav.platform.enums.storage.DriveNodeHealth;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.settings.SystemConfigurationRepository;
import com.uav.platform.repository.storage.StorageDriveNodeRepository;
import com.uav.platform.repository.storage.StorageDriveObjectRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.media.HybridObjectStorageServiceImpl;
import com.uav.platform.service.impl.settings.SystemConfigurationOperations;
import com.uav.platform.service.media.ObjectStorageService;
import com.uav.platform.service.storage.pool.StoragePoolService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class StoragePoolServiceImpl implements StoragePoolService {
    private static final String R2_CANDIDATES_SQL =
            """
            SELECT object_key, content_type, size_bytes FROM (
                SELECT a.object_key AS object_key, a.content_type AS content_type, a.size AS size_bytes, a.created_at AS created_at
                  FROM media_assets a
                 WHERE a.deleted = FALSE AND a.confirmed = TRUE
                   AND NOT EXISTS (SELECT 1 FROM storage_drive_objects d WHERE d.object_key = a.object_key)
                UNION ALL
                SELECT t.object_key AS object_key, t.content_type AS content_type, t.size_bytes AS size_bytes, t.created_at AS created_at
                  FROM training_assets t
                 WHERE t.status = 'READY'
                   AND NOT EXISTS (SELECT 1 FROM storage_drive_objects d WHERE d.object_key = t.object_key)
            ) u
            ORDER BY u.created_at ASC
            LIMIT ?
            """;

    private static final String R2_TOTALS_SQL =
            """
            SELECT COUNT(*) AS cnt, COALESCE(SUM(size_bytes), 0) AS total_bytes FROM (
                SELECT a.object_key AS object_key, a.size AS size_bytes
                  FROM media_assets a
                 WHERE a.deleted = FALSE AND a.confirmed = TRUE
                   AND NOT EXISTS (SELECT 1 FROM storage_drive_objects d WHERE d.object_key = a.object_key)
                UNION ALL
                SELECT t.object_key AS object_key, t.size_bytes AS size_bytes
                  FROM training_assets t
                 WHERE t.status = 'READY'
                   AND NOT EXISTS (SELECT 1 FROM storage_drive_objects d WHERE d.object_key = t.object_key)
            ) u
            """;

    private final ObjectMapper mapper = new ObjectMapper();
    private final JdbcTemplate jdbc;
    private final StorageDriveNodeRepository driveNodes;
    private final StorageDriveObjectRepository driveObjects;
    private final MediaAssetRepository mediaAssets;
    private final SystemConfigurationRepository settings;
    private final StorageAllocationOperations allocator;
    private final GoogleDriveClientOperations driveClient;
    private final ObjectStorageService objectStorage;
    private final AuditLogService audit;
    private final String envClientId;
    private final String envClientSecret;
    private final String publicAppUrl;
    private final Set<String> allowedOrigins;

    @Autowired
    public StoragePoolServiceImpl(
            JdbcTemplate jdbc,
            StorageDriveNodeRepository driveNodes,
            StorageDriveObjectRepository driveObjects,
            MediaAssetRepository mediaAssets,
            SystemConfigurationRepository settings,
            StorageAllocationOperations allocator,
            GoogleDriveClientOperations driveClient,
            ObjectStorageService objectStorage,
            AuditLogService audit,
            @Value("${GOOGLE_DRIVE_CLIENT_ID:${GOOGLE_CLIENT_ID:}}") String envClientId,
            @Value("${GOOGLE_DRIVE_CLIENT_SECRET:}") String envClientSecret,
            @Value("${app.public-url:http://localhost:3300}") String publicAppUrl,
            @Value("${app.cors.allowed-origins:}") String corsOrigins) {
        this.jdbc = jdbc;
        this.driveNodes = driveNodes;
        this.driveObjects = driveObjects;
        this.mediaAssets = mediaAssets;
        this.settings = settings;
        this.allocator = allocator;
        this.driveClient = driveClient;
        this.objectStorage = objectStorage;
        this.audit = audit;
        this.envClientId = envClientId == null ? "" : envClientId.trim();
        this.envClientSecret = envClientSecret == null ? "" : envClientSecret.trim();
        this.publicAppUrl =
                StringUtils.hasText(publicAppUrl) ? publicAppUrl.trim() : "http://localhost:3300";
        this.allowedOrigins = new LinkedHashSet<>();
        this.allowedOrigins.add(this.publicAppUrl);
        if (StringUtils.hasText(corsOrigins)) {
            Arrays.stream(corsOrigins.split(","))
                    .map(String::trim)
                    .filter(StringUtils::hasText)
                    .forEach(this.allowedOrigins::add);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public StoragePoolOverviewResponse overview() {
        List<StorageDriveNode> allNodes = driveNodes.findAllByOrderByPriorityWeightDescIdAsc();
        List<StorageDriveNodeResponse> nodeDtos = allNodes.stream().map(this::toNodeDto).toList();

        long activeCount =
                allNodes.stream()
                        .filter(n -> n.isEnabled() && n.getHealthStatus() != DriveNodeHealth.DOWN)
                        .count();
        long driveObjCount = driveObjects.count();
        long driveBytes = driveObjCount == 0 ? 0L : driveObjects.sumAllBytes();

        boolean anyUnlimited =
                allNodes.stream()
                        .anyMatch(
                                n ->
                                        n.isEnabled()
                                                && (n.getQuotaLimitBytes() == null
                                                        || n.getQuotaLimitBytes() <= 0));
        Long totalLimit = null;
        Long totalFree = null;
        if (!allNodes.isEmpty() && !anyUnlimited) {
            long sumLimit = 0L;
            long sumFree = 0L;
            for (StorageDriveNode n : allNodes) {
                if (!n.isEnabled() || n.getQuotaLimitBytes() == null) continue;
                sumLimit += n.getQuotaLimitBytes();
                long used = n.getQuotaUsedBytes() == null ? 0L : n.getQuotaUsedBytes();
                sumFree += Math.max(0L, n.getQuotaLimitBytes() - used);
            }
            totalLimit = sumLimit;
            totalFree = sumFree;
        }

        Map<String, Object> r2Row = jdbc.queryForMap(R2_TOTALS_SQL);
        long r2Count = ((Number) r2Row.getOrDefault("cnt", 0L)).longValue();
        long r2Bytes = ((Number) r2Row.getOrDefault("total_bytes", 0L)).longValue();

        OAuthAppCredentials oauth = resolveOAuthApp(false);
        String callbackUrl =
                allocator
                        .baseUriBuilder()
                        .path(ApiRoutes.Admin.FULL_STORAGE_POOL_OAUTH_CALLBACK)
                        .build()
                        .toUriString();

        return new StoragePoolOverviewResponse(
                allocator.primaryBackend(),
                allocator.allocationStrategy(),
                allocator.fallbackToR2(),
                allocator.tieredSmallFileMaxBytes(),
                oauth != null,
                oauth == null ? null : maskClientId(oauth.clientId()),
                callbackUrl,
                activeCount,
                driveObjCount,
                driveBytes,
                totalLimit,
                totalFree,
                r2Count,
                r2Bytes,
                nodeDtos);
    }

    @Override
    @Transactional
    public StoragePoolOverviewResponse updatePolicy(
            StoragePoolPolicyRequest request, String actor) {
        upsertSetting(
                StorageAllocationOperations.KEY_PRIMARY_BACKEND,
                request.primaryBackend().name(),
                SettingValueType.ENUM,
                actor);
        upsertSetting(
                StorageAllocationOperations.KEY_ALLOCATION_STRATEGY,
                request.allocationStrategy().name(),
                SettingValueType.ENUM,
                actor);
        upsertSetting(
                StorageAllocationOperations.KEY_FALLBACK_R2,
                String.valueOf(Boolean.TRUE.equals(request.fallbackToR2())),
                SettingValueType.BOOLEAN,
                actor);
        if (request.tieredSmallFileMaxBytes() != null) {
            upsertSetting(
                    StorageAllocationOperations.KEY_TIERED_SMALL_MAX,
                    String.valueOf(request.tieredSmallFileMaxBytes()),
                    SettingValueType.INTEGER,
                    actor);
        }
        audit.record(
                null,
                actor,
                AuditAction.UPDATE,
                "STORAGE_POOL",
                "policy",
                request.primaryBackend() + "/" + request.allocationStrategy());
        return overview();
    }

    @Override
    @Transactional
    public StoragePoolOverviewResponse saveOAuthConfig(
            GoogleOAuthConfigRequest request, String actor) {
        String clientId = request.clientId().trim();
        upsertSetting(
                StorageAllocationOperations.KEY_OAUTH_CLIENT_ID,
                clientId,
                SettingValueType.STRING,
                actor);
        if (StringUtils.hasText(request.clientSecret())) {
            upsertSetting(
                    StorageAllocationOperations.KEY_OAUTH_CLIENT_SECRET_ENC,
                    driveClient.encryptSecret(request.clientSecret().trim()),
                    SettingValueType.STRING,
                    actor);
        } else if (resolveOAuthApp(false) == null) {
            throw SystemException.badRequest(
                    "Vui lòng nhập Client Secret lần đầu khi thiết lập Google OAuth.",
                    "DRIVE_OAUTH_SECRET_REQUIRED");
        }
        audit.record(
                null,
                actor,
                AuditAction.UPDATE,
                "STORAGE_POOL",
                "oauth-config",
                maskClientId(clientId));
        return overview();
    }

    @Override
    @Transactional(readOnly = true)
    public GoogleOAuthAuthorizeResponse createOAuthAuthorizeUrl(
            GoogleOAuthAuthorizeRequest request, String actor) {
        OAuthAppCredentials oauth = resolveOAuthApp(true);
        String redirectUri =
                allocator
                        .baseUriBuilder()
                        .path(ApiRoutes.Admin.FULL_STORAGE_POOL_OAUTH_CALLBACK)
                        .build()
                        .toUriString();
        String safeReturnOrigin =
                sanitizeReturnOrigin(request == null ? null : request.returnOrigin());

        try {
            Map<String, Object> stateMap = new LinkedHashMap<>();
            stateMap.put("actor", actor);
            stateMap.put(
                    "displayName",
                    request != null && StringUtils.hasText(request.displayName())
                            ? request.displayName().trim()
                            : "");
            stateMap.put(
                    "rootFolderId",
                    request != null && StringUtils.hasText(request.rootFolderId())
                            ? request.rootFolderId().trim()
                            : "");
            stateMap.put(
                    "priorityWeight",
                    request != null && request.priorityWeight() != null
                            ? request.priorityWeight()
                            : 100);
            stateMap.put(
                    "maxUsagePercent",
                    request != null && request.maxUsagePercent() != null
                            ? request.maxUsagePercent()
                            : 92);
            stateMap.put(
                    "routedModules",
                    normalizeModules(request == null ? null : request.routedModules()));
            stateMap.put("redirectUri", redirectUri);
            stateMap.put("returnOrigin", safeReturnOrigin);
            stateMap.put("exp", Instant.now().plusSeconds(600).getEpochSecond());

            String encodedPayload =
                    Base64.getUrlEncoder()
                            .withoutPadding()
                            .encodeToString(mapper.writeValueAsBytes(stateMap));
            String state = encodedPayload + "." + allocator.signOAuthState(encodedPayload);
            String url = driveClient.buildOAuthAuthorizeUrl(oauth.clientId(), redirectUri, state);
            return new GoogleOAuthAuthorizeResponse(url, redirectUri);
        } catch (IOException ex) {
            throw new IllegalStateException("Cannot encode OAuth state", ex);
        }
    }

    @Override
    @Transactional
    public URI completeOAuthCallback(String code, String state, String error) {
        JsonNode stateJson = verifyAndParseState(state);
        String returnOrigin = sanitizeReturnOrigin(stateJson.path("returnOrigin").asText(null));
        if (StringUtils.hasText(error) || !StringUtils.hasText(code)) {
            return buildCallbackRedirect(returnOrigin, false, "OAUTH_CANCELLED");
        }
        try {
            OAuthAppCredentials oauth = resolveOAuthApp(true);
            String redirectUri = stateJson.path("redirectUri").asText();
            String refreshToken =
                    driveClient.exchangeAuthorizationCode(
                            oauth.clientId(), oauth.clientSecret(), code.trim(), redirectUri);
            String encrypted =
                    driveClient.encryptOAuthCredentials(
                            oauth.clientId(), oauth.clientSecret(), refreshToken);

            StorageDriveNode probe = new StorageDriveNode();
            probe.setAuthType(DriveAuthType.OAUTH2);
            probe.setEncryptedCredentials(encrypted);
            String requestedRoot = stateJson.path("rootFolderId").asText("");
            if (StringUtils.hasText(requestedRoot)) probe.setRootFolderId(requestedRoot.trim());

            DriveAboutInfo about = driveClient.fetchAbout(probe);
            driveClient.ensureRootFolder(probe);

            StorageDriveNode node =
                    StringUtils.hasText(about.email())
                            ? driveNodes
                                    .findByAccountEmailIgnoreCase(about.email())
                                    .filter(
                                            existing ->
                                                    !StringUtils.hasText(requestedRoot)
                                                            || requestedRoot
                                                                    .trim()
                                                                    .equals(
                                                                            existing
                                                                                    .getRootFolderId()))
                                    .orElseGet(StorageDriveNode::new)
                            : new StorageDriveNode();

            if (node.getCode() == null) {
                node.setCode(generateNodeCode(about.email()));
            }
            String displayName = stateJson.path("displayName").asText("");
            node.setDisplayName(
                    StringUtils.hasText(displayName)
                            ? displayName
                            : (StringUtils.hasText(about.email())
                                    ? "Google Drive · " + about.email()
                                    : "Google Drive #" + node.getCode()));
            node.setAuthType(DriveAuthType.OAUTH2);
            node.setAccountEmail(about.email());
            node.setEncryptedCredentials(encrypted);
            node.setRootFolderId(probe.getRootFolderId());
            node.setEnabled(true);
            node.setPriorityWeight(stateJson.path("priorityWeight").asInt(100));
            node.setMaxUsagePercent(stateJson.path("maxUsagePercent").asInt(92));
            node.setRoutedModules(normalizeModules(stateJson.path("routedModules").asText("ALL")));
            applyAboutQuota(node, about);
            StorageDriveNode saved = driveNodes.save(node);
            driveClient.evictToken(saved.getId());

            audit.record(
                    null,
                    stateJson.path("actor").asText("SYSTEM"),
                    AuditAction.CREATE,
                    "STORAGE_DRIVE_NODE",
                    saved.getCode(),
                    "OAUTH2 connected");
            return buildCallbackRedirect(returnOrigin, true, saved.getCode());
        } catch (RuntimeException ex) {
            log.warn("Google Drive OAuth callback failed: {}", ex.getClass().getSimpleName());
            String codeMsg =
                    ex instanceof SystemException se && StringUtils.hasText(se.getCode())
                            ? se.getCode()
                            : "OAUTH_FAILED";
            return buildCallbackRedirect(returnOrigin, false, codeMsg);
        }
    }

    @Override
    @Transactional
    public StorageDriveNodeResponse createNode(
            StorageDriveNodeCreateRequest request, String actor) {
        StorageDriveNode node = new StorageDriveNode();
        node.setDisplayName(request.displayName().trim());
        node.setAuthType(request.authType());
        node.setEnabled(true);
        node.setPriorityWeight(request.priorityWeight() == null ? 100 : request.priorityWeight());
        node.setMaxUsagePercent(request.maxUsagePercent() == null ? 92 : request.maxUsagePercent());
        node.setRoutedModules(normalizeModules(request.routedModules()));
        if (StringUtils.hasText(request.rootFolderId())) {
            node.setRootFolderId(request.rootFolderId().trim());
        }

        if (request.authType() == DriveAuthType.SERVICE_ACCOUNT) {
            if (!StringUtils.hasText(request.serviceAccountJson())) {
                throw SystemException.badRequest(
                        "Vui lòng dán nội dung JSON của Service Account.",
                        "DRIVE_SA_JSON_REQUIRED");
            }
            if (!StringUtils.hasText(request.rootFolderId())) {
                throw SystemException.badRequest(
                        "Service Account cần nhập ID thư mục gốc hoặc Shared Drive đã chia sẻ quyền Editor.",
                        "DRIVE_ROOT_FOLDER_REQUIRED");
            }
            var parsed = driveClient.encryptServiceAccountJson(request.serviceAccountJson());
            node.setAccountEmail(parsed.clientEmail());
            node.setEncryptedCredentials(parsed.encryptedCredentials());
        } else {
            if (!StringUtils.hasText(request.refreshToken())) {
                throw SystemException.badRequest(
                        "Vui lòng nhập Refresh Token hoặc dùng nút Đăng nhập Google OAuth.",
                        "DRIVE_REFRESH_TOKEN_REQUIRED");
            }
            String clientId =
                    StringUtils.hasText(request.clientId()) ? request.clientId().trim() : null;
            String clientSecret =
                    StringUtils.hasText(request.clientSecret())
                            ? request.clientSecret().trim()
                            : null;
            if (!StringUtils.hasText(clientId) || !StringUtils.hasText(clientSecret)) {
                OAuthAppCredentials savedApp = resolveOAuthApp(true);
                if (!StringUtils.hasText(clientId)) clientId = savedApp.clientId();
                if (!StringUtils.hasText(clientSecret)) clientSecret = savedApp.clientSecret();
            }
            node.setEncryptedCredentials(
                    driveClient.encryptOAuthCredentials(
                            clientId, clientSecret, request.refreshToken()));
        }

        DriveAboutInfo about = driveClient.fetchAbout(node);
        driveClient.ensureRootFolder(node);
        if (StringUtils.hasText(about.email())) {
            node.setAccountEmail(about.email());
        }
        node.setCode(generateNodeCode(node.getAccountEmail()));
        applyAboutQuota(node, about);

        StorageDriveNode saved = driveNodes.save(node);
        audit.record(
                null,
                actor,
                AuditAction.CREATE,
                "STORAGE_DRIVE_NODE",
                saved.getCode(),
                saved.getAuthType().name());
        return toNodeDto(saved);
    }

    @Override
    @Transactional
    public StorageDriveNodeResponse updateNode(
            Long id, StorageDriveNodeUpdateRequest request, String actor) {
        StorageDriveNode node = findNode(id);
        node.setDisplayName(request.displayName().trim());
        if (request.enabled() != null) node.setEnabled(request.enabled());
        if (request.priorityWeight() != null) node.setPriorityWeight(request.priorityWeight());
        if (request.maxUsagePercent() != null) node.setMaxUsagePercent(request.maxUsagePercent());
        if (request.routedModules() != null) {
            node.setRoutedModules(normalizeModules(request.routedModules()));
        }
        if (request.rootFolderId() != null) {
            String nextRoot = request.rootFolderId().trim();
            if (!nextRoot.equals(node.getRootFolderId() == null ? "" : node.getRootFolderId())) {
                node.setRootFolderId(nextRoot.isEmpty() ? null : nextRoot);
                node.setFolderCacheJson(null);
                if (node.isEnabled()) {
                    driveClient.ensureRootFolder(node);
                }
            }
        }
        applyHealthFromQuota(node);
        StorageDriveNode saved = driveNodes.save(node);
        audit.record(
                null, actor, AuditAction.UPDATE, "STORAGE_DRIVE_NODE", saved.getCode(), "UPDATED");
        return toNodeDto(saved);
    }

    @Override
    @Transactional
    public StorageDriveNodeResponse syncNode(Long id, String actor) {
        StorageDriveNode node = findNode(id);
        driveClient.evictToken(node.getId());
        try {
            DriveAboutInfo about = driveClient.fetchAbout(node);
            driveClient.ensureRootFolder(node);
            if (StringUtils.hasText(about.email())) {
                node.setAccountEmail(about.email());
            }
            applyAboutQuota(node, about);
        } catch (RuntimeException ex) {
            node.setHealthStatus(DriveNodeHealth.DOWN);
            node.setLastError(
                    ex instanceof SystemException se && StringUtils.hasText(se.getCode())
                            ? se.getCode()
                            : ex.getClass().getSimpleName());
            node.setLastCheckedAt(LocalDateTime.now());
        }
        StorageDriveNode saved = driveNodes.save(node);
        return toNodeDto(saved);
    }

    @Override
    @Transactional
    public void deleteNode(Long id, String actor) {
        StorageDriveNode node = findNode(id);
        long count = driveObjects.countByNodeId(node.getId());
        if (count > 0) {
            throw SystemException.conflict(
                    "Ổ Google Drive \""
                            + node.getDisplayName()
                            + "\" vẫn đang lưu "
                            + count
                            + " tệp. Không thể gỡ để tránh mất dữ liệu.",
                    "DRIVE_NODE_NOT_EMPTY");
        }
        driveClient.evictToken(node.getId());
        driveNodes.delete(node);
        audit.record(
                null, actor, AuditAction.DELETE, "STORAGE_DRIVE_NODE", node.getCode(), "DELETED");
    }

    @Override
    @Transactional
    public StorageR2MigrationResponse migrateFromR2(
            StorageR2MigrationRequest request, String actor) {
        int limit = request == null || request.limit() == null ? 25 : request.limit();
        boolean deleteR2 = request != null && Boolean.TRUE.equals(request.deleteSourceFromR2());
        Long targetNodeId = request == null ? null : request.targetNodeId();

        StorageDriveNode explicitTarget = targetNodeId == null ? null : findNode(targetNodeId);
        if (explicitTarget != null && !explicitTarget.isEnabled()) {
            throw SystemException.badRequest(
                    "Ổ Google Drive đích đang bị tạm ngưng.", "DRIVE_NODE_DISABLED");
        }

        List<CandidateRow> rows =
                jdbc.query(
                        R2_CANDIDATES_SQL,
                        (rs, i) ->
                                new CandidateRow(
                                        rs.getString("object_key"),
                                        rs.getString("content_type"),
                                        rs.getLong("size_bytes")),
                        limit);

        int migratedCount = 0;
        long migratedBytes = 0L;
        int failedCount = 0;

        for (CandidateRow row : rows) {
            try {
                long transferred =
                        transferSingleKeyFromR2(
                                row.objectKey(),
                                row.contentType(),
                                row.sizeBytes(),
                                explicitTarget,
                                deleteR2);
                migratedCount++;
                migratedBytes += transferred;
            } catch (RuntimeException ex) {
                failedCount++;
                log.warn(
                        "Failed migrating R2 object {} to Google Drive: {}",
                        row.objectKey(),
                        ex.getMessage());
            }
        }

        Map<String, Object> remaining = jdbc.queryForMap(R2_TOTALS_SQL);
        long remCount = ((Number) remaining.getOrDefault("cnt", 0L)).longValue();
        long remBytes = ((Number) remaining.getOrDefault("total_bytes", 0L)).longValue();

        audit.record(
                null,
                actor,
                AuditAction.UPDATE,
                "STORAGE_POOL",
                "migrate-r2",
                "migrated=" + migratedCount + ",failed=" + failedCount);
        return new StorageR2MigrationResponse(
                migratedCount, migratedBytes, failedCount, remCount, remBytes);
    }

    @Override
    @Transactional
    public StorageR2MigrationResponse migrateSingleFile(
            String fileId, boolean deleteSourceFromR2, String actor) {
        String[] parts = fileId == null ? new String[0] : fileId.split(":", 2);
        if (parts.length != 2) {
            throw SystemException.badRequest("Mã tệp không hợp lệ.", "FILE_NOT_FOUND");
        }
        long dbId;
        try {
            dbId = Long.parseLong(parts[1]);
        } catch (NumberFormatException ex) {
            throw SystemException.badRequest("Mã tệp không hợp lệ.", "FILE_NOT_FOUND");
        }
        CandidateRow target;
        if ("TRAINING".equalsIgnoreCase(parts[0])) {
            List<CandidateRow> found =
                    jdbc.query(
                            "SELECT object_key, content_type, size_bytes FROM training_assets WHERE id = ? AND status = 'READY'",
                            (rs, i) ->
                                    new CandidateRow(
                                            rs.getString("object_key"),
                                            rs.getString("content_type"),
                                            rs.getLong("size_bytes")),
                            dbId);
            if (found.isEmpty()) {
                throw SystemException.notFound(
                        "Không tìm thấy tệp đào tạo sẵn sàng.", "FILE_NOT_FOUND");
            }
            target = found.get(0);
        } else {
            List<CandidateRow> found =
                    jdbc.query(
                            "SELECT object_key, content_type, size AS size_bytes FROM media_assets WHERE id = ? AND deleted = FALSE AND confirmed = TRUE",
                            (rs, i) ->
                                    new CandidateRow(
                                            rs.getString("object_key"),
                                            rs.getString("content_type"),
                                            rs.getLong("size_bytes")),
                            dbId);
            if (found.isEmpty()) {
                throw SystemException.notFound("Không tìm thấy tệp đã xác nhận.", "FILE_NOT_FOUND");
            }
            target = found.get(0);
        }

        if (driveObjects.existsByObjectKey(target.objectKey())) {
            Map<String, Object> remaining = jdbc.queryForMap(R2_TOTALS_SQL);
            return new StorageR2MigrationResponse(
                    0,
                    0L,
                    0,
                    ((Number) remaining.getOrDefault("cnt", 0L)).longValue(),
                    ((Number) remaining.getOrDefault("total_bytes", 0L)).longValue());
        }

        long bytes =
                transferSingleKeyFromR2(
                        target.objectKey(),
                        target.contentType(),
                        target.sizeBytes(),
                        null,
                        deleteSourceFromR2);
        audit.record(
                null,
                actor,
                AuditAction.UPDATE,
                "STORED_FILE",
                fileId,
                "MIGRATED_TO_DRIVE " + target.objectKey());
        Map<String, Object> remaining = jdbc.queryForMap(R2_TOTALS_SQL);
        return new StorageR2MigrationResponse(
                1,
                bytes,
                0,
                ((Number) remaining.getOrDefault("cnt", 0L)).longValue(),
                ((Number) remaining.getOrDefault("total_bytes", 0L)).longValue());
    }

    private long transferSingleKeyFromR2(
            String objectKey,
            String contentType,
            long registeredSize,
            StorageDriveNode explicitNode,
            boolean deleteSourceFromR2) {
        StorageDriveNode node =
                explicitNode != null
                        ? explicitNode
                        : selectAnyEligibleDriveNode(objectKey, contentType, registeredSize);
        ObjectStorageService r2 =
                objectStorage instanceof HybridObjectStorageServiceImpl hybrid
                        ? hybrid.r2Delegate()
                        : objectStorage;

        DriveUploadedFile uploaded;
        try (ObjectStream sourceStream = r2.openStream(objectKey, null)) {
            long streamSize =
                    sourceStream.contentLength() >= 0
                            ? sourceStream.contentLength()
                            : registeredSize;
            uploaded =
                    driveClient.uploadStream(
                            node, objectKey, contentType, streamSize, sourceStream.body());
        } catch (IOException ex) {
            throw SystemException.serviceUnavailable(
                    "Lỗi luồng dữ liệu khi chuyển tệp từ R2 sang Google Drive.",
                    "DRIVE_MIGRATION_IO_ERROR");
        }

        if (registeredSize > 0 && uploaded.sizeBytes() != registeredSize) {
            driveClient.deleteFile(node, uploaded.driveFileId());
            throw SystemException.conflict(
                    "Dung lượng tệp sau khi tải lên Google Drive không khớp bản gốc trên R2.",
                    "DRIVE_MIGRATION_SIZE_MISMATCH");
        }

        StorageDriveObject obj = new StorageDriveObject();
        obj.setObjectKey(objectKey);
        obj.setNode(node);
        obj.setDriveFileId(uploaded.driveFileId());
        obj.setDriveFolderId(uploaded.driveFolderId());
        obj.setModuleFolder(uploaded.moduleFolder());
        obj.setFileName(uploaded.fileName());
        obj.setContentType(uploaded.contentType());
        obj.setSizeBytes(uploaded.sizeBytes());
        driveObjects.save(obj);

        if (node.getQuotaUsedBytes() != null) {
            node.setQuotaUsedBytes(node.getQuotaUsedBytes() + uploaded.sizeBytes());
        }
        applyHealthFromQuota(node);
        driveNodes.save(node);

        mediaAssets
                .findByObjectKey(objectKey)
                .ifPresent(
                        asset -> {
                            String tag = "gdrive:" + node.getCode();
                            asset.setStorageProvider(
                                    tag.length() > 30 ? tag.substring(0, 30) : tag);
                            mediaAssets.save(asset);
                        });

        if (deleteSourceFromR2) {
            try {
                r2.deleteObject(objectKey);
            } catch (RuntimeException ex) {
                log.warn("Transferred {} to Drive but could not remove R2 copy", objectKey);
            }
        }
        return uploaded.sizeBytes();
    }

    private StorageDriveNode selectAnyEligibleDriveNode(
            String objectKey, String contentType, long sizeBytes) {
        Optional<StorageDriveNode> viaPolicy =
                allocator.selectNode(objectKey, contentType, sizeBytes);
        if (viaPolicy.isPresent()) return viaPolicy.get();
        return driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc().stream()
                .filter(n -> n.getHealthStatus() != DriveNodeHealth.DOWN)
                .filter(n -> StorageAllocationOperations.hasCapacity(n, sizeBytes))
                .findFirst()
                .orElseThrow(
                        () ->
                                SystemException.badRequest(
                                        "Chưa có ổ Google Drive nào đang hoạt động và còn dung lượng trống.",
                                        "DRIVE_POOL_EMPTY"));
    }

    private StorageDriveNode findNode(Long id) {
        return driveNodes
                .findById(id)
                .orElseThrow(
                        () ->
                                SystemException.notFound(
                                        "Không tìm thấy ổ Google Drive.", "DRIVE_NODE_NOT_FOUND"));
    }

    private StorageDriveNodeResponse toNodeDto(StorageDriveNode n) {
        Long limit = n.getQuotaLimitBytes();
        Long used = n.getQuotaUsedBytes();
        Long free =
                limit != null && limit > 0
                        ? Math.max(0L, limit - (used == null ? 0L : used))
                        : null;
        Double pct =
                limit != null && limit > 0 && used != null
                        ? Math.round((used * 1000.0) / limit) / 10.0
                        : null;
        long objCount = n.getId() == null ? 0L : driveObjects.countByNodeId(n.getId());
        long objBytes = objCount == 0L ? 0L : driveObjects.sumBytesByNodeId(n.getId());
        return new StorageDriveNodeResponse(
                n.getId(),
                n.getCode(),
                n.getDisplayName(),
                n.getAuthType(),
                n.getAccountEmail(),
                n.getRootFolderId(),
                n.isEnabled(),
                n.getPriorityWeight(),
                n.getMaxUsagePercent(),
                n.getRoutedModules(),
                limit,
                used,
                n.getQuotaDriveBytes(),
                free,
                pct,
                objCount,
                objBytes,
                n.getHealthStatus(),
                n.getLastError(),
                n.getLastCheckedAt(),
                n.getCreatedAt());
    }

    private void applyAboutQuota(StorageDriveNode node, DriveAboutInfo about) {
        node.setQuotaLimitBytes(about.limitBytes());
        node.setQuotaUsedBytes(about.usedBytes());
        node.setQuotaDriveBytes(about.driveBytes());
        node.setLastError(null);
        node.setLastCheckedAt(LocalDateTime.now());
        applyHealthFromQuota(node);
    }

    private static void applyHealthFromQuota(StorageDriveNode node) {
        if (!StorageAllocationOperations.hasCapacity(node, 0L)) {
            node.setHealthStatus(DriveNodeHealth.QUOTA_FULL);
        } else {
            node.setHealthStatus(DriveNodeHealth.UP);
        }
    }

    private OAuthAppCredentials resolveOAuthApp(boolean required) {
        String dbClientId =
                settings.findByConfigKey(StorageAllocationOperations.KEY_OAUTH_CLIENT_ID)
                        .map(SystemConfiguration::getConfigValue)
                        .filter(StringUtils::hasText)
                        .orElse(null);
        String dbSecretEnc =
                settings.findByConfigKey(StorageAllocationOperations.KEY_OAUTH_CLIENT_SECRET_ENC)
                        .map(SystemConfiguration::getConfigValue)
                        .filter(StringUtils::hasText)
                        .orElse(null);
        if (StringUtils.hasText(dbClientId) && StringUtils.hasText(dbSecretEnc)) {
            return new OAuthAppCredentials(
                    dbClientId.trim(), driveClient.decryptSecret(dbSecretEnc.trim()));
        }
        if (StringUtils.hasText(envClientId) && StringUtils.hasText(envClientSecret)) {
            return new OAuthAppCredentials(envClientId, envClientSecret);
        }
        if (required) {
            throw SystemException.badRequest(
                    "Chưa cấu hình Google OAuth Client ID & Client Secret. Hãy lưu thông tin OAuth trên trang Kho tệp trước.",
                    "DRIVE_OAUTH_NOT_CONFIGURED");
        }
        return null;
    }

    private JsonNode verifyAndParseState(String state) {
        if (!StringUtils.hasText(state) || !state.contains(".")) {
            throw SystemException.badRequest(
                    "Phiên xác thực OAuth không hợp lệ.", "DRIVE_OAUTH_STATE_INVALID");
        }
        int dot = state.lastIndexOf('.');
        String encoded = state.substring(0, dot);
        String sig = state.substring(dot + 1);
        if (!allocator.verifyOAuthState(encoded, sig)) {
            throw SystemException.badRequest(
                    "Chữ ký phiên xác thực OAuth không hợp lệ.", "DRIVE_OAUTH_STATE_INVALID");
        }
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(encoded);
            JsonNode json = mapper.readTree(decoded);
            long exp = json.path("exp").asLong(0L);
            if (Instant.now().getEpochSecond() > exp) {
                throw SystemException.badRequest(
                        "Phiên xác thực Google OAuth đã hết hạn (quá 10 phút).",
                        "DRIVE_OAUTH_STATE_EXPIRED");
            }
            return json;
        } catch (SystemException ex) {
            throw ex;
        } catch (Exception ex) {
            throw SystemException.badRequest(
                    "Dữ liệu trạng thái OAuth không hợp lệ.", "DRIVE_OAUTH_STATE_INVALID");
        }
    }

    private String sanitizeReturnOrigin(String candidate) {
        if (StringUtils.hasText(candidate)) {
            String trimmed = candidate.trim().replaceAll("/+$", "");
            if (allowedOrigins.contains(trimmed)
                    || trimmed.matches("^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$")) {
                return trimmed;
            }
        }
        return publicAppUrl.replaceAll("/+$", "");
    }

    private static URI buildCallbackRedirect(String origin, boolean ok, String info) {
        UriComponentsBuilder b =
                UriComponentsBuilder.fromUriString(origin + "/admin/infrastructure/storage");
        if (ok) {
            b.queryParam("driveConnected", info);
        } else {
            b.queryParam("driveError", info);
        }
        return b.build().encode().toUri();
    }

    private void upsertSetting(String key, String value, SettingValueType type, String actor) {
        SystemConfiguration cfg =
                settings.findByConfigKey(key)
                        .orElseGet(
                                () -> {
                                    SystemConfiguration created =
                                            SystemConfigurationOperations.create(
                                                    key,
                                                    value,
                                                    "STORAGE",
                                                    "Cấu hình kho lưu trữ Google Drive Pool",
                                                    actor);
                                    created.setValueType(type);
                                    created.setPublicSetting(false);
                                    return created;
                                });
        cfg.setConfigValue(value);
        cfg.setUpdatedBy(actor);
        cfg.setPublicSetting(false);
        settings.save(cfg);
    }

    private static String normalizeModules(String raw) {
        if (!StringUtils.hasText(raw)) return "ALL";
        List<String> parts =
                Arrays.stream(raw.split(","))
                        .map(s -> s.trim().toUpperCase(Locale.ROOT))
                        .filter(StringUtils::hasText)
                        .distinct()
                        .toList();
        return parts.isEmpty() || parts.contains("ALL") ? "ALL" : String.join(",", parts);
    }

    private String generateNodeCode(String email) {
        String prefix = "gdrive";
        if (StringUtils.hasText(email) && email.contains("@")) {
            String local =
                    email.substring(0, email.indexOf('@'))
                            .toLowerCase(Locale.ROOT)
                            .replaceAll("[^a-z0-9]+", "-");
            if (StringUtils.hasText(local)) {
                prefix =
                        "gdrive-"
                                + (local.length() > 14 ? local.substring(0, 14) : local)
                                        .replaceAll("^-|-$", "");
            }
        }
        String suffix = UUID.randomUUID().toString().substring(0, 6);
        return prefix + "-" + suffix;
    }

    private static String maskClientId(String clientId) {
        if (!StringUtils.hasText(clientId)) return null;
        String trimmed = clientId.trim();
        if (trimmed.length() <= 14)
            return trimmed.substring(0, Math.min(4, trimmed.length())) + "…";
        return trimmed.substring(0, 10) + "…" + trimmed.substring(trimmed.length() - 12);
    }
}
