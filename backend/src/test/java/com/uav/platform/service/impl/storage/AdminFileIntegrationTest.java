package com.uav.platform.service.impl.storage;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uav.platform.dto.request.storage.AdminFileQueryRequest;
import com.uav.platform.dto.response.storage.AdminFileResponse;
import com.uav.platform.dto.response.storage.AdminFileSummaryResponse;
import com.uav.platform.entity.media.MediaAsset;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.training.TrainingAsset;
import com.uav.platform.entity.training.TrainingDocument;
import com.uav.platform.entity.training.TrainingLesson;
import com.uav.platform.entity.training.TrainingLessonSlide;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.media.MediaType;
import com.uav.platform.enums.mission.MissionPriority;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.enums.storage.StoredFileKind;
import com.uav.platform.enums.storage.StoredFileModule;
import com.uav.platform.enums.storage.StoredFileStatus;
import com.uav.platform.enums.training.TrainingAssetStatus;
import com.uav.platform.enums.training.TrainingLessonType;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.training.TrainingAssetRepository;
import com.uav.platform.repository.training.TrainingDocumentRepository;
import com.uav.platform.repository.training.TrainingLessonRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.impl.mission.MissionOperations;
import com.uav.platform.service.media.ObjectStorageService;
import com.uav.platform.service.storage.AdminFileService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Admin file manager against H2: status classification, filters and paging, delete rules and the gate. */
@SpringBootTest(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:admin_files;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
            "app.media.cleanup-enabled=false"
        })
class AdminFileIntegrationTest {
    @Autowired AdminFileService service;
    @Autowired MediaAssetRepository media;
    @Autowired TrainingAssetRepository trainingAssets;
    @Autowired TrainingDocumentRepository courses;
    @Autowired TrainingLessonRepository lessons;
    @Autowired UserRepository users;
    @Autowired MissionRepository missions;
    @Autowired JdbcTemplate db;
    @Autowired WebApplicationContext context;
    @MockitoBean ObjectStorageService storage;

    private AppUser admin;
    private AppUser pilot;
    private Mission mission;
    private TrainingDocument course;

    @BeforeEach
    void setUp() {
        db.update("DELETE FROM training_lesson_slides");
        db.update("DELETE FROM training_lesson_resources");
        db.update("UPDATE training_lessons SET video_asset_id = NULL, document_asset_id = NULL");
        db.update("UPDATE training_documents SET cover_asset_id = NULL");
        db.update("DELETE FROM training_assets");
        db.update("DELETE FROM mission_media");
        db.update("UPDATE ai_tasks SET media_id = NULL");
        db.update("DELETE FROM media_assets");
        db.update("UPDATE users SET avatar_url = NULL");
        reset(storage);
        when(storage.provider()).thenReturn("test");
        when(storage.createSignedDownloadUrl(anyString(), any(Duration.class)))
                .thenReturn("https://storage.example.invalid/signed");

        admin = user(UserRole.ROLE_ADMIN, "Quản trị viên");
        pilot = user(UserRole.ROLE_PILOT, "Phi công");
        mission =
                MissionOperations.draft(
                        pilot,
                        MissionType.UAV_RENTAL,
                        "Khảo sát",
                        null,
                        LocalDate.now(),
                        LocalDateTime.now().plusDays(1),
                        LocalDateTime.now().plusDays(1).plusHours(1),
                        "Bãi đáp",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        mission.setCode("MSN-AF-" + token());
        mission = missions.save(mission);
        course = course("Bay an toàn " + token());
    }

    @Test
    void classifiesEveryStoredFileByWhatReferencesIt() {
        Fixture f = fixture();

        Map<String, AdminFileResponse> rows = byName(all());
        assertEquals(11, rows.size(), "deleted media is not listed");
        assertFalse(rows.containsKey("deleted.png"));

        AdminFileResponse cover = rows.get("cover.png");
        assertEquals(StoredFileModule.TRAINING, cover.module());
        assertEquals(StoredFileStatus.IN_USE, cover.status());
        assertEquals(StoredFileKind.IMAGE, cover.kind());
        assertEquals("COURSE", cover.linkedTo().type());
        assertEquals(course.getId(), cover.linkedTo().id());
        assertEquals(course.getTitle(), cover.linkedTo().label());
        assertEquals(course.getSlug(), cover.linkedTo().slug());
        assertEquals(admin.getId(), cover.owner().id());
        assertEquals("Quản trị viên", cover.owner().name());
        assertEquals("TRAINING:" + f.cover.getId(), cover.id());
        assertFalse(cover.deletable());

        assertEquals(StoredFileStatus.IN_USE, rows.get("slide.png").status());
        assertEquals(StoredFileStatus.IN_USE, rows.get("lesson.mp4").status());
        assertEquals(StoredFileKind.VIDEO, rows.get("lesson.mp4").kind());

        AdminFileResponse spare = rows.get("spare.pdf");
        assertEquals(StoredFileStatus.UNUSED, spare.status());
        assertEquals(StoredFileKind.DOCUMENT, spare.kind());
        assertNull(spare.linkedTo());
        assertTrue(spare.deletable());

        AdminFileResponse uploading = rows.get("uploading.pdf");
        assertEquals(StoredFileStatus.PENDING, uploading.status());
        assertFalse(uploading.deletable(), "a training upload may still be in flight");
        assertTrue(rows.get("abandoned.pdf").deletable());

        AdminFileResponse attached = rows.get("result.mp4");
        assertEquals(StoredFileModule.MISSION_MEDIA, attached.module());
        assertEquals(StoredFileStatus.IN_USE, attached.status());
        assertEquals("MISSION", attached.linkedTo().type());
        assertEquals(mission.getCode(), attached.linkedTo().label());
        assertEquals(pilot.getId(), attached.owner().id());

        AdminFileResponse loose = rows.get("not-attached.jpg");
        assertEquals(StoredFileModule.MISSION_MEDIA, loose.module());
        assertEquals(StoredFileStatus.UNUSED, loose.status());
        assertFalse(loose.deletable(), "mission media is read-only");

        AdminFileResponse avatar = rows.get("avatar.webp");
        assertEquals(StoredFileModule.AVATAR, avatar.module());
        assertEquals(StoredFileStatus.IN_USE, avatar.status());
        assertEquals("USER", avatar.linkedTo().type());
        assertEquals(pilot.getId(), avatar.linkedTo().id());

        AdminFileResponse orphan = rows.get("orphan.zip");
        assertEquals(StoredFileModule.UNLINKED, orphan.module());
        assertEquals(StoredFileStatus.UNUSED, orphan.status());
        assertEquals(StoredFileKind.OTHER, orphan.kind());
        assertTrue(orphan.deletable());

        assertEquals(StoredFileStatus.PENDING, rows.get("never-confirmed.png").status());
        assertTrue(rows.get("never-confirmed.png").deletable());
    }

    @Test
    void summaryTotalsModulesKindsAndLargestFiles() {
        fixture();
        AdminFileSummaryResponse summary = service.summary();
        long totalBytes = all().stream().mapToLong(AdminFileResponse::sizeBytes).sum();
        assertEquals(11, summary.total().count());
        assertEquals(totalBytes, summary.total().bytes());
        // spare.pdf, not-attached.jpg, orphan.zip
        assertEquals(3, summary.unused().count());
        assertEquals(300 + 700 + 900, summary.unused().bytes());
        // uploading.pdf, abandoned.pdf, never-confirmed.png
        assertEquals(3, summary.pending().count());

        var training =
                summary.byModule().stream()
                        .filter(m -> m.module() == StoredFileModule.TRAINING)
                        .findFirst()
                        .orElseThrow();
        assertEquals(6, training.count());
        assertEquals(1, training.unusedCount());
        assertEquals(2, training.pendingCount());
        assertEquals(
                summary.total().count(),
                summary.byKind().stream()
                        .mapToLong(AdminFileSummaryResponse.KindTotal::count)
                        .sum());
        assertEquals("lesson.mp4", summary.largest().getFirst().fileName());
        assertEquals(10, summary.largest().size());
    }

    @Test
    void filtersSortsAndPages() {
        fixture();
        var trainingUnused =
                service.list(
                        new AdminFileQueryRequest(
                                StoredFileModule.TRAINING, null, StoredFileStatus.UNUSED, null),
                        0,
                        20,
                        null);
        assertEquals(List.of("spare.pdf"), names(trainingUnused.content()));

        var images =
                service.list(
                        new AdminFileQueryRequest(null, StoredFileKind.IMAGE, null, null),
                        0,
                        20,
                        "sizeBytes,asc");
        assertEquals(
                List.of(
                        "cover.png",
                        "slide.png",
                        "avatar.webp",
                        "never-confirmed.png",
                        "not-attached.jpg"),
                names(images.content()));

        // Search reaches the linked item and the owner as well as the name.
        assertEquals(
                2,
                service.list(
                                new AdminFileQueryRequest(null, null, null, mission.getCode()),
                                0,
                                20,
                                null)
                        .totalElements());
        assertEquals(
                0,
                service.list(new AdminFileQueryRequest(null, null, null, "100%_"), 0, 20, null)
                        .totalElements(),
                "LIKE wildcards in the search are literal");

        var first =
                service.list(new AdminFileQueryRequest(null, null, null, null), 0, 4, "size,desc");
        var third =
                service.list(new AdminFileQueryRequest(null, null, null, null), 2, 4, "size,desc");
        assertEquals(11, first.totalElements());
        assertEquals(3, first.totalPages());
        assertEquals(4, first.content().size());
        assertEquals("lesson.mp4", first.content().getFirst().fileName());
        assertEquals(3, third.content().size());
        assertTrue(third.last());
        // Unknown sort fields fall back to newest first instead of reaching SQL.
        assertEquals(
                11,
                service.list(new AdminFileQueryRequest(null, null, null, null), 0, 50, "id;drop")
                        .content()
                        .size());
        assertEquals(
                "created_at asc, source asc, db_id asc",
                AdminFileServiceImpl.orderBy("1=1 --,asc"));
    }

    @Test
    void deletesUnusedAndPendingFilesButNeverInUseOrMissionMedia() throws Exception {
        Fixture f = fixture();

        SystemException inUse =
                assertThrows(
                        SystemException.class,
                        () -> service.delete("TRAINING:" + f.cover.getId(), "admin"));
        assertEquals(HttpStatus.CONFLICT, inUse.getStatus());
        assertEquals("FILE_IN_USE", inUse.getCode());
        assertTrue(inUse.getMessage().contains(course.getTitle()));
        SystemException missionMedia =
                assertThrows(
                        SystemException.class,
                        () -> service.delete("MISSION_MEDIA:" + f.notAttached.getId(), "admin"));
        assertEquals("FILE_MISSION_MEDIA_READ_ONLY", missionMedia.getCode());
        assertEquals(
                "FILE_UPLOAD_IN_PROGRESS",
                assertThrows(
                                SystemException.class,
                                () -> service.delete("TRAINING:" + f.uploading.getId(), "admin"))
                        .getCode());
        // The module in the id must match the row.
        assertEquals(
                HttpStatus.NOT_FOUND,
                assertThrows(
                                SystemException.class,
                                () -> service.delete("AVATAR:" + f.orphan.getId(), "admin"))
                        .getStatus());
        verify(storage, never()).deleteObject(anyString());

        service.delete("TRAINING:" + f.spare.getId(), "admin");
        assertTrue(trainingAssets.findById(f.spare.getId()).isEmpty());
        verify(storage).deleteObject(f.spare.getObjectKey());

        service.delete("UNLINKED:" + f.orphan.getId(), "admin");
        MediaAsset tombstone = media.findById(f.orphan.getId()).orElseThrow();
        assertTrue(tombstone.isDeleted());
        assertNotNull(tombstone.getObjectDeletedAt());
        verify(storage).deleteObject(f.orphan.getObjectKey());

        service.delete("TRAINING:" + f.abandoned.getId(), "admin");
        assertEquals(8, all().size());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM audit_logs WHERE entity_type = 'STORED_FILE' AND action = 'DELETE'"
                                + " AND entity_id = ?",
                        Integer.class,
                        "UNLINKED:" + f.orphan.getId()));

        // Over HTTP the in-use refusal is a 409 with the Vietnamese message.
        mvc().perform(
                        delete("/api/v1/admin/files/TRAINING:" + f.cover.getId())
                                .with(as(admin))
                                .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FILE_IN_USE"));
    }

    @Test
    void storageFailureKeepsTheTrainingRecord() {
        Fixture f = fixture();
        doThrow(new IllegalStateException("down"))
                .when(storage)
                .deleteObject(f.spare.getObjectKey());
        SystemException failed =
                assertThrows(
                        SystemException.class,
                        () -> service.delete("TRAINING:" + f.spare.getId(), "admin"));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, failed.getStatus());
        assertTrue(trainingAssets.findById(f.spare.getId()).isPresent());
    }

    @Test
    void endpointsRequireThePermissionManagePermission() throws Exception {
        Fixture f = fixture();
        AppUser operator = user(UserRole.ROLE_OPERATOR, "Điều phối");
        MockMvc mvc = mvc();
        mvc.perform(get("/api/v1/admin/files").param("status", "UNUSED").with(as(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[0].id").exists());
        mvc.perform(get("/api/v1/admin/files/summary").with(as(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total.count").value(11));
        mvc.perform(
                        get("/api/v1/admin/files/TRAINING:" + f.spare.getId() + "/download")
                                .with(as(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://storage.example.invalid/signed"))
                .andExpect(jsonPath("$.expiresInSeconds").value(300));
        verify(storage)
                .createSignedDownloadUrl(eq(f.spare.getObjectKey()), eq(Duration.ofMinutes(5)));
        mvc.perform(get("/api/v1/admin/files").param("status", "BOGUS").with(as(admin)))
                .andExpect(status().isBadRequest());

        mvc.perform(get("/api/v1/admin/files").with(as(operator)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/files/summary").with(as(operator)))
                .andExpect(status().isForbidden());
        mvc.perform(
                        delete("/api/v1/admin/files/TRAINING:" + f.spare.getId())
                                .with(as(operator))
                                .with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/files")).andExpect(status().isUnauthorized());
        verify(storage, never()).deleteObject(anyString());
        assertTrue(trainingAssets.findById(f.spare.getId()).isPresent());
    }

    /** Eleven listed files and one deleted media row, owned by the admin (training) and the pilot (media). */
    private Fixture fixture() {
        Fixture f = new Fixture();
        f.cover = training("cover.png", "image/png", 100, TrainingAssetStatus.READY);
        f.slide = training("slide.png", "image/png", 200, TrainingAssetStatus.READY);
        f.video = training("lesson.mp4", "video/mp4", 5_000, TrainingAssetStatus.READY);
        f.spare = training("spare.pdf", "application/pdf", 300, TrainingAssetStatus.READY);
        f.uploading =
                training("uploading.pdf", "application/pdf", 400, TrainingAssetStatus.PENDING);
        f.abandoned =
                training("abandoned.pdf", "application/pdf", 450, TrainingAssetStatus.PENDING);
        db.update(
                "UPDATE training_assets SET created_at = ? WHERE id = ?",
                LocalDateTime.now().minusHours(2),
                f.abandoned.getId());
        course.setCoverAssetId(f.cover.getId());
        courses.save(course);
        TrainingLesson lesson = new TrainingLesson();
        lesson.setDocument(course);
        lesson.setTitle("Cất cánh");
        lesson.setType(TrainingLessonType.VIDEO);
        lesson.setVideoAssetId(f.video.getId());
        lesson.getSlides().add(new TrainingLessonSlide(f.slide.getId(), null));
        lessons.save(lesson);

        f.attached = media("result.mp4", "video/mp4", 1_000, "MISSION", true);
        db.update(
                "INSERT INTO mission_media (mission_id, media_id, media_role, created_at, updated_at)"
                        + " VALUES (?, ?, 'OUTPUT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                mission.getId(),
                f.attached.getId());
        f.notAttached = media("not-attached.jpg", "image/jpeg", 700, "MISSION", true);
        MediaAsset avatar = media("avatar.webp", "image/webp", 250, null, true);
        pilot.setAvatarUrl("/api/v1/users/" + pilot.getId() + "/avatar?v=" + avatar.getId());
        users.save(pilot);
        f.orphan = media("orphan.zip", "application/zip", 900, null, true);
        media("never-confirmed.png", "image/png", 600, null, false);
        MediaAsset deleted = media("deleted.png", "image/png", 99_999, null, true);
        deleted.setDeleted(true);
        media.save(deleted);
        return f;
    }

    private static final class Fixture {
        TrainingAsset cover, slide, video, spare, uploading, abandoned;
        MediaAsset attached, notAttached, orphan;
    }

    private TrainingAsset training(
            String name, String type, long size, TrainingAssetStatus status) {
        TrainingAsset asset = new TrainingAsset();
        asset.setObjectKey("training/" + token() + "-" + name);
        asset.setFileName(name);
        asset.setContentType(type);
        asset.setSizeBytes(size);
        asset.setStatus(status);
        asset.setUploadedBy(admin.getUsername());
        return trainingAssets.save(asset);
    }

    private MediaAsset media(String name, String type, long size, String link, boolean confirmed) {
        MediaAsset asset =
                new MediaAsset(
                        name,
                        "media/" + token() + "-" + name,
                        type,
                        size,
                        type.startsWith("video/") ? MediaType.VIDEO : MediaType.IMAGE,
                        link,
                        link == null ? null : mission.getId().toString(),
                        pilot.getUsername(),
                        "test");
        asset.setConfirmed(confirmed);
        return media.save(asset);
    }

    private TrainingDocument course(String title) {
        TrainingDocument doc = new TrainingDocument();
        doc.setCode("AF-" + token());
        doc.setSlug("af-" + token());
        doc.setTargetPortal("OPERATIONS");
        doc.setCategory("SAFETY");
        doc.setLevel("BASIC");
        doc.setTitle(title);
        doc.setSummary("Tóm tắt");
        doc.setContentMarkdown("");
        return courses.save(doc);
    }

    private List<AdminFileResponse> all() {
        return service.list(new AdminFileQueryRequest(null, null, null, null), 0, 100, null)
                .content();
    }

    private static Map<String, AdminFileResponse> byName(List<AdminFileResponse> rows) {
        return rows.stream()
                .collect(Collectors.toMap(AdminFileResponse::fileName, Function.identity()));
    }

    private static List<String> names(List<AdminFileResponse> rows) {
        return rows.stream().map(AdminFileResponse::fileName).toList();
    }

    private AppUser user(UserRole role, String fullName) {
        String s = token();
        return users.save(
                new AppUser(
                        "af_" + s,
                        "af_" + s + "@example.invalid",
                        "synthetic-placeholder",
                        null,
                        null,
                        fullName,
                        null,
                        role,
                        UserStatus.ACTIVE));
    }

    private MockMvc mvc() {
        return MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    private static RequestPostProcessor as(AppUser user) {
        return authentication(
                new UsernamePasswordAuthenticationToken(
                        user.getUsername(),
                        null,
                        List.of(new SimpleGrantedAuthority(user.getRole().name()))));
    }

    private static String token() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
