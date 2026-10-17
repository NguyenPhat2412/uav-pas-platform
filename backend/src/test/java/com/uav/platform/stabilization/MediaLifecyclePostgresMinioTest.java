package com.uav.platform.stabilization;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.media.dto.request.MediaUploadRequest;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.enums.MediaType;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.media.service.*;
import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.repository.*;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(
        named = "UAV_STABILIZATION_DB_URL",
        matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/uav_(stabilization|ba_test_suite)")
@EnabledIfEnvironmentVariable(named = "UAV_STABILIZATION_MINIO_ENDPOINT", matches = "https?://.+")
class MediaLifecyclePostgresMinioTest {
    private static final String SCHEMA =
            "media_lifecycle_" + UUID.randomUUID().toString().replace("-", "");
    private static final byte[] PDF =
            "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"
                    .getBytes(StandardCharsets.US_ASCII);

    @DynamicPropertySource
    static void configuration(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", () -> System.getenv("UAV_STABILIZATION_DB_URL"));
        p.add("spring.datasource.username", () -> System.getenv("UAV_STABILIZATION_DB_USER"));
        p.add("spring.datasource.password", () -> System.getenv("UAV_STABILIZATION_DB_PASSWORD"));
        p.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        p.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        p.add("spring.flyway.enabled", () -> true);
        p.add("spring.flyway.schemas", () -> SCHEMA);
        p.add("spring.flyway.default-schema", () -> SCHEMA);
        p.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        p.add("spring.datasource.hikari.connection-init-sql", () -> "SET search_path TO " + SCHEMA);
        p.add("spring.datasource.hikari.maximum-pool-size", () -> 8);
        p.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        p.add("app.phase1.compatibility-schema.enabled", () -> false);
        p.add("app.media.cleanup-enabled", () -> false);
        p.add("app.billing.invoice-worker-enabled", () -> false);
        p.add("app.storage.provider", () -> "minio");
        p.add("app.storage.endpoint", () -> System.getenv("UAV_STABILIZATION_MINIO_ENDPOINT"));
        p.add(
                "app.storage.public-endpoint",
                () -> System.getenv("UAV_STABILIZATION_MINIO_ENDPOINT"));
        p.add("app.storage.access-key", () -> System.getenv("UAV_STABILIZATION_MINIO_USER"));
        p.add("app.storage.secret-key", () -> System.getenv("UAV_STABILIZATION_MINIO_PASSWORD"));
        p.add("app.storage.bucket", () -> System.getenv("UAV_STABILIZATION_MINIO_BUCKET"));
        p.add("app.storage.ensure-bucket", () -> true);
    }

    @Autowired MediaService media;
    @Autowired MediaCleanupService cleanup;
    @Autowired MediaAssetRepository assets;
    @Autowired MissionRepository missions;
    @Autowired com.uav.platform.modules.mission.service.MissionService missionService;
    @Autowired MissionMediaRepository links;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate db;
    @MockitoSpyBean ObjectStorageService storage;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;
    AppUser owner;
    Mission mission;
    final List<String> keys = new ArrayList<>();

    @BeforeEach
    void fixture() {
        db.execute("TRUNCATE users,uav_stations,media_assets,audit_logs CASCADE");
        owner =
                users.save(
                        new AppUser(
                                "media_owner",
                                "media@example.invalid",
                                "fixture",
                                null,
                                null,
                                null,
                                null,
                                UserRole.ROLE_ADMIN,
                                UserStatus.ACTIVE));
        LocalDateTime start = LocalDateTime.now().plusDays(1);
        mission =
                Mission.draft(
                        owner,
                        MissionType.AREA_INSPECTION,
                        "Media lifecycle",
                        null,
                        start.toLocalDate(),
                        start,
                        start.plusHours(1),
                        "Synthetic location",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        mission.setCode("MEDIA-" + UUID.randomUUID().toString().substring(0, 8));
        mission = missions.save(mission);
        authenticate();
    }

    @AfterEach
    void removeOnlyFixtureObjects() {
        reset(storage);
        for (String key : keys) storage.deleteObject(key);
        SecurityContextHolder.clearContext();
    }

    void authenticate() {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        UsernamePasswordAuthenticationToken.authenticated(
                                owner.getUsername(), null, List.of()));
    }

    MediaAsset register(boolean linked) {
        var response =
                media.register(
                        new MediaUploadRequest(
                                "result.pdf",
                                "application/pdf",
                                PDF.length,
                                MediaType.DOCUMENT,
                                linked ? "MISSION" : null,
                                linked ? mission.getId().toString() : null),
                        owner.getUsername());
        var asset = assets.findById(response.id()).orElseThrow();
        keys.add(asset.getObjectKey());
        return asset;
    }

    void put(MediaAsset asset, byte[] content, boolean signedSize) throws Exception {
        String url =
                signedSize
                        ? media.uploadUrl(asset.getId()).url()
                        : storage.createSignedUploadUrl(
                                asset.getObjectKey(), asset.getContentType());
        int status =
                HttpClient.newHttpClient()
                        .send(
                                HttpRequest.newBuilder(URI.create(url))
                                        .header("Content-Type", asset.getContentType())
                                        .header("If-None-Match", "*")
                                        .PUT(HttpRequest.BodyPublishers.ofByteArray(content))
                                        .build(),
                                HttpResponse.BodyHandlers.discarding())
                        .statusCode();
        assertEquals(200, status);
    }

    void expire(MediaAsset asset) {
        db.update(
                "UPDATE media_assets SET created_at=?,upload_valid_until=NULL WHERE id=?",
                LocalDateTime.now().minusHours(25),
                asset.getId());
    }

    @Test
    void metadataAndContentMismatchCannotConfirmOrProduceHandoverLinks() throws Exception {
        var wrongSize = register(true);
        put(wrongSize, new byte[PDF.length + 1], false);
        assertThrows(
                SystemException.class, () -> media.confirm(wrongSize.getId(), owner.getUsername()));
        var wrongMime = register(true);
        String wrongMimeUrl = storage.createSignedUploadUrl(wrongMime.getObjectKey(), "image/png");
        assertEquals(
                200,
                HttpClient.newHttpClient()
                        .send(
                                HttpRequest.newBuilder(URI.create(wrongMimeUrl))
                                        .header("Content-Type", "image/png")
                                        .header("If-None-Match", "*")
                                        .PUT(HttpRequest.BodyPublishers.ofByteArray(PDF))
                                        .build(),
                                HttpResponse.BodyHandlers.discarding())
                        .statusCode());
        assertThrows(
                SystemException.class, () -> media.confirm(wrongMime.getId(), owner.getUsername()));
        var wrongHeader = register(true);
        put(wrongHeader, new byte[PDF.length], true);
        assertThrows(
                SystemException.class,
                () -> media.confirm(wrongHeader.getId(), owner.getUsername()));
        assertFalse(assets.findById(wrongHeader.getId()).orElseThrow().isConfirmed());
        assertEquals(0, links.count());
    }

    @Test
    void expiredUnconfirmedIsRemovedButConfirmedAttachedAndTerminalHandoverSurvive()
            throws Exception {
        var orphan = register(true);
        put(orphan, PDF, true);
        expire(orphan);
        var confirmed = register(false);
        put(confirmed, PDF, true);
        media.confirm(confirmed.getId(), owner.getUsername());
        expire(confirmed);
        var handover = register(true);
        put(handover, PDF, true);
        media.confirm(handover.getId(), owner.getUsername());
        expire(handover);
        links.save(new MissionMedia(mission, handover, MediaRole.OUTPUT, owner));
        db.update("UPDATE missions SET status='COMPLETED' WHERE id=?", mission.getId());
        assertEquals(1, cleanup.runBatch());
        assertFalse(storage.objectExists(orphan.getObjectKey()));
        assertTrue(storage.objectExists(confirmed.getObjectKey()));
        assertTrue(storage.objectExists(handover.getObjectKey()));
        assertTrue(assets.findById(orphan.getId()).orElseThrow().isDeleted());
        assertEquals(1, links.count());
        assertThrows(
                RuntimeException.class, () -> media.confirm(orphan.getId(), owner.getUsername()));
    }

    @Test
    void urlAndConfirmationExpireWithoutWaiting24HoursAndUrlIsCappedToRetention() {
        var a = register(false);
        db.update(
                "UPDATE media_assets SET created_at=? WHERE id=?",
                LocalDateTime.now().minusHours(24).plusMinutes(2),
                a.getId());
        var signed = media.uploadUrl(a.getId());
        assertTrue(signed.expiresInSeconds() <= 120 && signed.expiresInSeconds() > 0);
        expire(a);
        assertThrows(SystemException.class, () -> media.uploadUrl(a.getId()));
        assertThrows(SystemException.class, () -> media.confirm(a.getId(), owner.getUsername()));
    }

    @Test
    void durableRetryBackoffSurvivesWorkerRecreationAndStorageSuccessBeforeDatabaseCommit()
            throws Exception {
        var a = register(false);
        put(a, PDF, true);
        expire(a);
        doThrow(new IllegalStateException("synthetic timeout"))
                .when(storage)
                .deleteObject(a.getObjectKey());
        assertFalse(cleanup.process(a.getId()));
        var failed = assets.findById(a.getId()).orElseThrow();
        assertTrue(failed.isDeleted());
        assertEquals(1, failed.getDeleteAttempts());
        assertNotNull(failed.getDeleteAfter());
        assertFalse(cleanup.process(a.getId()));
        assertTrue(storage.objectExists(a.getObjectKey()));
        reset(storage);
        // Storage success followed by process crash before DB commit: retrying absent object is
        // safe.
        storage.deleteObject(a.getObjectKey());
        db.update(
                "UPDATE media_assets SET delete_after=? WHERE id=?",
                LocalDateTime.now().minusSeconds(1),
                a.getId());
        assertTrue(cleanup.process(a.getId()));
        assertNotNull(assets.findById(a.getId()).orElseThrow().getObjectDeletedAt());
        assertFalse(cleanup.process(a.getId()));
    }

    @Test
    void deletionWaitsForOutstandingSignedPutAndThenRemovesAnObjectUploadedAfterRequest()
            throws Exception {
        var a = register(false);
        String url = media.uploadUrl(a.getId()).url();
        media.delete(a.getId(), owner.getUsername());
        assertFalse(cleanup.process(a.getId()));
        assertEquals(
                200,
                HttpClient.newHttpClient()
                        .send(
                                HttpRequest.newBuilder(URI.create(url))
                                        .header("Content-Type", "application/pdf")
                                        .header("If-None-Match", "*")
                                        .PUT(HttpRequest.BodyPublishers.ofByteArray(PDF))
                                        .build(),
                                HttpResponse.BodyHandlers.discarding())
                        .statusCode());
        db.update(
                "UPDATE media_assets SET delete_after=?,upload_valid_until=? WHERE id=?",
                LocalDateTime.now().minusSeconds(1),
                LocalDateTime.now().minusSeconds(1),
                a.getId());
        assertTrue(cleanup.process(a.getId()));
        assertFalse(storage.objectExists(a.getObjectKey()));
    }

    @Test
    void durableTombstoneSweepRemovesLateFinishingPutAfterFirstSuccessfulDeletion()
            throws Exception {
        var a = register(false);
        String issued = media.uploadUrl(a.getId()).url();
        put(a, PDF, true);
        expire(a);
        assertTrue(cleanup.process(a.getId()));
        assertFalse(storage.objectExists(a.getObjectKey()));
        // Model a PUT admitted before expiry but completed after deletion. Timestamp changes avoid
        // a 24h wall-clock wait.
        assertEquals(
                200,
                HttpClient.newHttpClient()
                        .send(
                                HttpRequest.newBuilder(URI.create(issued))
                                        .header("Content-Type", "application/pdf")
                                        .header("If-None-Match", "*")
                                        .PUT(HttpRequest.BodyPublishers.ofByteArray(PDF))
                                        .build(),
                                HttpResponse.BodyHandlers.discarding())
                        .statusCode());
        db.update(
                "UPDATE media_assets SET delete_after=? WHERE id=?",
                LocalDateTime.now().minusSeconds(1),
                a.getId());
        assertEquals(1, cleanup.runBatch());
        assertFalse(storage.objectExists(a.getObjectKey()));
        assertNotNull(assets.findById(a.getId()).orElseThrow().getObjectDeletedAt());
    }

    @Test
    void competingWorkersDeleteOnlyOnceAndBackoffDoesNotStarveLaterOrphans() throws Exception {
        var a = register(true);
        put(a, PDF, true);
        expire(a);
        var pool = Executors.newFixedThreadPool(2);
        var gate = new CountDownLatch(1);
        try {
            var one =
                    pool.submit(
                            () -> {
                                gate.await();
                                return cleanup.process(a.getId());
                            });
            var two =
                    pool.submit(
                            () -> {
                                gate.await();
                                return cleanup.process(a.getId());
                            });
            gate.countDown();
            assertNotEquals(one.get(15, TimeUnit.SECONDS), two.get(15, TimeUnit.SECONDS));
            verify(storage, times(1)).deleteObject(a.getObjectKey());
        } finally {
            pool.shutdownNow();
        }
        for (int i = 0; i < 26; i++) {
            var f = register(false);
            expire(f);
            doThrow(new IllegalStateException("synthetic timeout"))
                    .when(storage)
                    .deleteObject(f.getObjectKey());
        }
        var healthy = register(false);
        put(healthy, PDF, true);
        expire(healthy);
        assertEquals(0, cleanup.runBatch());
        assertEquals(1, cleanup.runBatch());
        assertFalse(storage.objectExists(healthy.getObjectKey()));
    }

    @Test
    void explicitDeletionOfConfirmedUnattachedFileRemainsDurableWhileAttachedDeletionIsRejected()
            throws Exception {
        var standalone = register(false);
        put(standalone, PDF, true);
        media.confirm(standalone.getId(), owner.getUsername());
        expire(standalone);
        assertFalse(
                cleanup.process(
                        standalone.getId())); // Confirmation prevents automatic age cleanup.
        media.delete(standalone.getId(), owner.getUsername());
        assertTrue(cleanup.process(standalone.getId()));
        assertFalse(storage.objectExists(standalone.getObjectKey()));
        var attached = register(true);
        put(attached, PDF, true);
        media.confirm(attached.getId(), owner.getUsername());
        links.save(new MissionMedia(mission, attached, MediaRole.OUTPUT, owner));
        assertThrows(
                SystemException.class, () -> media.delete(attached.getId(), owner.getUsername()));
        var preserved = assets.findById(attached.getId()).orElseThrow();
        assertFalse(preserved.isDeleted());
        assertNull(preserved.getDeleteAfter());
        assertTrue(storage.objectExists(attached.getObjectKey()));
    }

    @Test
    void terminalTransitionWinningMissionLockRejectsConfirmationAndOnlyUnconfirmedOrphanCanExpire()
            throws Exception {
        var a = register(true);
        put(a, PDF, true);
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var terminal =
                    pool.submit(
                            () ->
                                    new org.springframework.transaction.support.TransactionTemplate(
                                                    transactionManager)
                                            .execute(
                                                    status -> {
                                                        var result =
                                                                missionService.cancel(
                                                                        mission.getId(),
                                                                        UsernamePasswordAuthenticationToken
                                                                                .authenticated(
                                                                                        owner
                                                                                                .getUsername(),
                                                                                        null,
                                                                                        List.of()));
                                                        entered.countDown();
                                                        try {
                                                            assertTrue(
                                                                    release.await(
                                                                            10, TimeUnit.SECONDS));
                                                        } catch (InterruptedException ex) {
                                                            throw new RuntimeException(ex);
                                                        }
                                                        return result;
                                                    }));
            assertTrue(entered.await(10, TimeUnit.SECONDS));
            var confirming = pool.submit(() -> media.confirm(a.getId(), owner.getUsername()));
            assertThrows(TimeoutException.class, () -> confirming.get(200, TimeUnit.MILLISECONDS));
            release.countDown();
            assertEquals(MissionStatus.CANCELLED, terminal.get(10, TimeUnit.SECONDS).status());
            assertInstanceOf(
                    SystemException.class,
                    assertThrows(
                                    ExecutionException.class,
                                    () -> confirming.get(10, TimeUnit.SECONDS))
                            .getCause());
            assertFalse(assets.findById(a.getId()).orElseThrow().isConfirmed());
            assertEquals(0, links.count());
            expire(a);
            assertTrue(cleanup.process(a.getId()));
            assertFalse(storage.objectExists(a.getObjectKey()));
        } finally {
            release.countDown();
            pool.shutdownNow();
        }
    }

    @Test
    void confirmationWinningMissionLockIsPreservedAfterConcurrentTerminalTransition()
            throws Exception {
        var a = register(true);
        put(a, PDF, true);
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        doAnswer(
                        invocation -> {
                            entered.countDown();
                            assertTrue(release.await(10, TimeUnit.SECONDS));
                            return invocation.callRealMethod();
                        })
                .when(storage)
                .metadata(a.getObjectKey());
        var pool = Executors.newFixedThreadPool(2);
        try {
            var confirming = pool.submit(() -> media.confirm(a.getId(), owner.getUsername()));
            assertTrue(entered.await(10, TimeUnit.SECONDS));
            var terminal =
                    pool.submit(
                            () ->
                                    missionService.cancel(
                                            mission.getId(),
                                            UsernamePasswordAuthenticationToken.authenticated(
                                                    owner.getUsername(), null, List.of())));
            assertThrows(TimeoutException.class, () -> terminal.get(200, TimeUnit.MILLISECONDS));
            release.countDown();
            assertTrue(confirming.get(10, TimeUnit.SECONDS).confirmed());
            assertEquals(MissionStatus.CANCELLED, terminal.get(10, TimeUnit.SECONDS).status());
            expire(a);
            assertFalse(cleanup.process(a.getId()));
            assertTrue(storage.objectExists(a.getObjectKey()));
            assertThrows(SystemException.class, () -> media.delete(a.getId(), owner.getUsername()));
            assertTrue(assets.findById(a.getId()).orElseThrow().isConfirmed());
            assertEquals(0, links.count());
        } finally {
            release.countDown();
            pool.shutdownNow();
        }
    }

    @Test
    void expiredCleanupWinningTheLockMakesConcurrentConfirmationFailWithoutLinks()
            throws Exception {
        var a = register(true);
        put(a, PDF, true);
        expire(a);
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        doAnswer(
                        invocation -> {
                            entered.countDown();
                            assertTrue(release.await(10, TimeUnit.SECONDS));
                            return invocation.callRealMethod();
                        })
                .when(storage)
                .deleteObject(a.getObjectKey());
        var pool = Executors.newFixedThreadPool(2);
        try {
            var cleaning = pool.submit(() -> cleanup.process(a.getId()));
            assertTrue(entered.await(10, TimeUnit.SECONDS));
            var confirming = pool.submit(() -> media.confirm(a.getId(), owner.getUsername()));
            assertThrows(TimeoutException.class, () -> confirming.get(200, TimeUnit.MILLISECONDS));
            release.countDown();
            assertTrue(cleaning.get(10, TimeUnit.SECONDS));
            assertInstanceOf(
                    SystemException.class,
                    assertThrows(
                                    ExecutionException.class,
                                    () -> confirming.get(10, TimeUnit.SECONDS))
                            .getCause());
            assertEquals(0, links.count());
            assertFalse(storage.objectExists(a.getObjectKey()));
            assertFalse(assets.findById(a.getId()).orElseThrow().isConfirmed());
        } finally {
            release.countDown();
            pool.shutdownNow();
        }
    }

    @Test
    void storageSuccessBeforeTransactionCrashRemainsRetryableByFreshWorker() throws Exception {
        var a = register(false);
        put(a, PDF, true);
        expire(a);
        doAnswer(
                        invocation -> {
                            Object response = invocation.callRealMethod();
                            org.springframework.transaction.support
                                    .TransactionSynchronizationManager.registerSynchronization(
                                    new org.springframework.transaction.support
                                            .TransactionSynchronization() {
                                        @Override
                                        public void beforeCommit(boolean readOnly) {
                                            throw new IllegalStateException(
                                                    "synthetic crash after object delete");
                                        }
                                    });
                            return response;
                        })
                .when(storage)
                .deleteObject(a.getObjectKey());
        assertThrows(IllegalStateException.class, () -> cleanup.process(a.getId()));
        assertFalse(storage.objectExists(a.getObjectKey()));
        assertFalse(assets.findById(a.getId()).orElseThrow().isDeleted());
        reset(storage);
        var restarted =
                new MediaCleanupService(
                        assets, missions, links, storage, entityManager, transactionManager, false);
        assertTrue(restarted.process(a.getId()));
        assertNotNull(assets.findById(a.getId()).orElseThrow().getObjectDeletedAt());
    }

    @Test
    void attachedLegacyTombstonesCannotStarveUnconfirmedCleanup() throws Exception {
        for (int i = 0; i < 25; i++) {
            var attached = register(true);
            expire(attached);
            links.save(new MissionMedia(mission, attached, MediaRole.OTHER, owner));
            db.update(
                    "UPDATE media_assets SET deleted=true,delete_after=? WHERE id=?",
                    LocalDateTime.now().minusDays(3),
                    attached.getId());
        }
        var orphan = register(true);
        put(orphan, PDF, true);
        expire(orphan);
        assertEquals(1, cleanup.runBatch());
        assertFalse(storage.objectExists(orphan.getObjectKey()));
        assertEquals(25, links.count());
    }

    @Test
    void cleanupWaitingOnConfirmationRechecksPersistedConfirmedState() throws Exception {
        var a = register(true);
        put(a, PDF, true);
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        doAnswer(
                        invocation -> {
                            entered.countDown();
                            assertTrue(release.await(10, TimeUnit.SECONDS));
                            return invocation.callRealMethod();
                        })
                .when(storage)
                .metadata(a.getObjectKey());
        var pool = Executors.newFixedThreadPool(2);
        try {
            var confirming = pool.submit(() -> media.confirm(a.getId(), owner.getUsername()));
            assertTrue(entered.await(10, TimeUnit.SECONDS));
            var cleaning = pool.submit(() -> cleanup.process(a.getId()));
            assertThrows(TimeoutException.class, () -> cleaning.get(200, TimeUnit.MILLISECONDS));
            release.countDown();
            assertTrue(confirming.get(10, TimeUnit.SECONDS).confirmed());
            assertFalse(cleaning.get(10, TimeUnit.SECONDS));
            assertTrue(storage.objectExists(a.getObjectKey()));
            assertFalse(assets.findById(a.getId()).orElseThrow().isDeleted());
        } finally {
            release.countDown();
            pool.shutdownNow();
        }
    }
}
