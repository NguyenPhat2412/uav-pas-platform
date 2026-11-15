package com.uav.platform.service.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uav.platform.dto.record.media.ObjectMetadata;
import com.uav.platform.dto.record.media.ObjectStream;
import com.uav.platform.dto.record.storage.DriveUploadedFile;
import com.uav.platform.dto.record.storage.ServiceAccountParsed;
import com.uav.platform.entity.settings.SystemConfiguration;
import com.uav.platform.entity.storage.StorageDriveNode;
import com.uav.platform.entity.storage.StorageDriveObject;
import com.uav.platform.enums.storage.DriveAuthType;
import com.uav.platform.enums.storage.DriveNodeHealth;
import com.uav.platform.repository.settings.SystemConfigurationRepository;
import com.uav.platform.repository.storage.StorageDriveNodeRepository;
import com.uav.platform.repository.storage.StorageDriveObjectRepository;
import com.uav.platform.service.impl.media.HybridObjectStorageServiceImpl;
import com.uav.platform.service.impl.media.S3CompatibleStorageService;
import com.uav.platform.service.impl.storage.GoogleDriveClientOperations;
import com.uav.platform.service.impl.storage.StorageAllocationOperations;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

class StoragePoolAndAllocationTest {

    private static final long GB = 1024L * 1024L * 1024L;

    private StorageDriveNodeRepository driveNodes;
    private StorageDriveObjectRepository driveObjects;
    private SystemConfigurationRepository settings;
    private StorageAllocationOperations allocator;

    @BeforeEach
    void setUp() {
        driveNodes = mock(StorageDriveNodeRepository.class);
        driveObjects = mock(StorageDriveObjectRepository.class);
        settings = mock(SystemConfigurationRepository.class);
        allocator =
                new StorageAllocationOperations(
                        driveNodes,
                        settings,
                        "unit-test-storage-hmac-secret",
                        "https://api.uav.all1.vn");
    }

    @Test
    void mostFreeSpaceSkipsDownAndCappedNodesAndPicksRoomiestDrive() {
        mockSetting(StorageAllocationOperations.KEY_PRIMARY_BACKEND, "GOOGLE_DRIVE");
        mockSetting(StorageAllocationOperations.KEY_ALLOCATION_STRATEGY, "MOST_FREE_SPACE");

        StorageDriveNode downNode =
                node(1L, "drive-down", "ALL", 100 * GB, 5 * GB, 92, DriveNodeHealth.DOWN);
        StorageDriveNode almostFull =
                node(2L, "drive-capped", "ALL", 15 * GB, 14 * GB, 90, DriveNodeHealth.UP);
        StorageDriveNode smallerFree =
                node(3L, "drive-small", "ALL", 15 * GB, 8 * GB, 92, DriveNodeHealth.UP);
        StorageDriveNode largestFree =
                node(4L, "drive-2tb", "ALL", 2000 * GB, 120 * GB, 92, DriveNodeHealth.UP);

        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(downNode, almostFull, smallerFree, largestFree));

        Optional<StorageDriveNode> selected =
                allocator.selectNode("missions/42/ortho.tif", "image/tiff", 250 * 1024 * 1024L);

        assertThat(selected).isPresent();
        assertThat(selected.get().getCode()).isEqualTo("drive-2tb");
    }

    @Test
    void modulePriorityPrefersDedicatedTrainingDriveOverGeneralDrive() {
        mockSetting(StorageAllocationOperations.KEY_PRIMARY_BACKEND, "GOOGLE_DRIVE");
        mockSetting(StorageAllocationOperations.KEY_ALLOCATION_STRATEGY, "MODULE_PRIORITY");

        StorageDriveNode generalHuge =
                node(1L, "drive-general", "ALL", 2000 * GB, 100 * GB, 92, DriveNodeHealth.UP);
        StorageDriveNode trainingDedicated =
                node(2L, "drive-training", "TRAINING", 100 * GB, 20 * GB, 92, DriveNodeHealth.UP);

        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(generalHuge, trainingDedicated));

        Optional<StorageDriveNode> selected =
                allocator.selectNode(
                        "training/course-01-intro.mp4", "video/mp4", 80 * 1024 * 1024L);

        assertThat(selected).isPresent();
        assertThat(selected.get().getCode()).isEqualTo("drive-training");
    }

    @Test
    void roundRobinAlternatesAcrossHealthyNodes() {
        mockSetting(StorageAllocationOperations.KEY_PRIMARY_BACKEND, "GOOGLE_DRIVE");
        mockSetting(StorageAllocationOperations.KEY_ALLOCATION_STRATEGY, "ROUND_ROBIN");

        StorageDriveNode n1 = node(1L, "drive-a", "ALL", 100 * GB, 10 * GB, 92, DriveNodeHealth.UP);
        StorageDriveNode n2 = node(2L, "drive-b", "ALL", 100 * GB, 10 * GB, 92, DriveNodeHealth.UP);
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(n1, n2));

        String first =
                allocator
                        .selectNode("missions/1/a.jpg", "image/jpeg", 1024)
                        .orElseThrow()
                        .getCode();
        String second =
                allocator
                        .selectNode("missions/1/b.jpg", "image/jpeg", 1024)
                        .orElseThrow()
                        .getCode();

        assertThat(List.of(first, second)).containsExactly("drive-a", "drive-b");
    }

    @Test
    void hybridTieredKeepsSmallImagesOnR2AndSendsVideosAndLargeAssetsToDrive() {
        mockSetting(StorageAllocationOperations.KEY_PRIMARY_BACKEND, "HYBRID_TIERED");
        mockSetting(
                StorageAllocationOperations.KEY_TIERED_SMALL_MAX, String.valueOf(5 * 1024 * 1024L));

        StorageDriveNode drive =
                node(1L, "drive-main", "ALL", 200 * GB, 10 * GB, 92, DriveNodeHealth.UP);
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(drive));

        // 512 KB avatar image -> keep on R2 (empty Drive selection)
        assertThat(allocator.selectNode("avatars/u1.webp", "image/webp", 512 * 1024L)).isEmpty();
        // 2 MB video -> goes to Google Drive even though < 5 MB
        assertThat(allocator.selectNode("training/clip.mp4", "video/mp4", 2 * 1024 * 1024L))
                .isPresent();
        // 12 MB drone inspection image -> exceeds 5 MB threshold, goes to Google Drive
        assertThat(allocator.selectNode("missions/9/thermal.jpg", "image/jpeg", 12 * 1024 * 1024L))
                .isPresent();
    }

    @Test
    void signedGatewayAndOAuthStateTokensVerifyAndRejectTampering() {
        long futureExp = Instant.now().plusSeconds(600).getEpochSecond();
        String uploadSig =
                allocator.signUpload(
                        "drive-a", "missions/1/video.mp4", "video/mp4", 4096L, futureExp);
        assertThat(
                        allocator.verifyUploadSignature(
                                "drive-a",
                                "missions/1/video.mp4",
                                "video/mp4",
                                4096L,
                                futureExp,
                                uploadSig))
                .isTrue();
        assertThat(
                        allocator.verifyUploadSignature(
                                "drive-a",
                                "missions/1/other.mp4",
                                "video/mp4",
                                4096L,
                                futureExp,
                                uploadSig))
                .isFalse();
        assertThat(
                        allocator.verifyUploadSignature(
                                "drive-a",
                                "missions/1/video.mp4",
                                "video/mp4",
                                4096L,
                                Instant.now().minusSeconds(5).getEpochSecond(),
                                uploadSig))
                .isFalse();

        String dlSig = allocator.signDownload("missions/1/video.mp4", futureExp);
        assertThat(allocator.verifyDownloadSignature("missions/1/video.mp4", futureExp, dlSig))
                .isTrue();

        String statePayload = "admin@uav.vn|drive-1|ALL|https://uav.all1.vn";
        String stateSig = allocator.signOAuthState(statePayload);
        assertThat(allocator.verifyOAuthState(statePayload, stateSig)).isTrue();
        assertThat(allocator.verifyOAuthState(statePayload + "|tampered", stateSig)).isFalse();
    }

    @Test
    void googleDriveCipherEncryptsOAuthAndServiceAccountCredentialsCleanly() throws Exception {
        GoogleDriveClientOperations client =
                new GoogleDriveClientOperations("cipher-test-secret", HttpClient.newHttpClient());

        String encOAuth =
                client.encryptOAuthCredentials(
                        "123-client.apps.googleusercontent.com", "GOCSPX-secret", "1//0refresh");
        assertThat(encOAuth).doesNotContain("GOCSPX-secret").doesNotContain("1//0refresh");
        assertThat(client.decryptSecret(encOAuth))
                .contains("123-client.apps.googleusercontent.com");

        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        KeyPair kp = kpg.generateKeyPair();
        String pem =
                "-----BEGIN PRIVATE KEY-----\\n"
                        + Base64.getEncoder().encodeToString(kp.getPrivate().getEncoded())
                        + "\\n-----END PRIVATE KEY-----";
        String saJson =
                "{\"client_email\":\"uav-storage@project.iam.gserviceaccount.com\",\"private_key\":\""
                        + pem
                        + "\"}";

        ServiceAccountParsed parsed = client.encryptServiceAccountJson(saJson);
        assertThat(parsed.clientEmail()).isEqualTo("uav-storage@project.iam.gserviceaccount.com");
        assertThat(parsed.encryptedCredentials()).doesNotContain("BEGIN PRIVATE KEY");
    }

    @Test
    void hybridStorageRoutesDriveMappedKeysToGoogleDriveAndLegacyKeysToR2() {
        mockSetting(StorageAllocationOperations.KEY_PRIMARY_BACKEND, "GOOGLE_DRIVE");
        mockSetting(StorageAllocationOperations.KEY_ALLOCATION_STRATEGY, "MOST_FREE_SPACE");
        mockSetting(StorageAllocationOperations.KEY_FALLBACK_R2, "true");

        S3CompatibleStorageService r2 = mock(S3CompatibleStorageService.class);
        GoogleDriveClientOperations driveClient = mock(GoogleDriveClientOperations.class);
        HybridObjectStorageServiceImpl hybrid =
                new HybridObjectStorageServiceImpl(
                        r2, driveNodes, driveObjects, allocator, driveClient);

        StorageDriveNode activeDrive =
                node(10L, "drive-pool-1", "ALL", 100 * GB, 5 * GB, 92, DriveNodeHealth.UP);
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(activeDrive));

        // 1. Direct upload routes to Google Drive and increments quotaUsedBytes
        byte[] payload = "drone-telemetry-log".getBytes(StandardCharsets.UTF_8);
        when(driveClient.uploadStream(
                        eq(activeDrive),
                        eq("missions/77/flight.bin"),
                        eq("application/octet-stream"),
                        eq((long) payload.length),
                        any()))
                .thenReturn(
                        new DriveUploadedFile(
                                "gfile-123",
                                "gfolder-missions",
                                "missions",
                                "77__flight.bin",
                                "application/octet-stream",
                                payload.length));
        when(driveObjects.findByObjectKey("missions/77/flight.bin")).thenReturn(Optional.empty());

        hybrid.uploadObject(
                "missions/77/flight.bin",
                "application/octet-stream",
                payload.length,
                new ByteArrayInputStream(payload));

        verify(driveObjects).save(any(StorageDriveObject.class));
        verify(r2, never()).uploadObject(any(), any(), any(Long.class), any());
        assertThat(activeDrive.getQuotaUsedBytes()).isEqualTo(5 * GB + payload.length);

        // 2. Mapped Drive object resolves download URL, metadata, stream, and delete via Drive
        StorageDriveObject mapped = new StorageDriveObject();
        mapped.setNode(activeDrive);
        mapped.setObjectKey("missions/77/flight.bin");
        mapped.setDriveFileId("gfile-123");
        mapped.setContentType("application/octet-stream");
        mapped.setSizeBytes(payload.length);
        when(driveObjects.existsByObjectKey("missions/77/flight.bin")).thenReturn(true);
        when(driveObjects.findByObjectKey("missions/77/flight.bin"))
                .thenReturn(Optional.of(mapped));
        when(driveClient.headFile(activeDrive, "gfile-123", "application/octet-stream"))
                .thenReturn(
                        Optional.of(
                                new ObjectMetadata(payload.length, "application/octet-stream")));
        ObjectStream expectedStream =
                new ObjectStream(
                        new ByteArrayInputStream(payload),
                        "application/octet-stream",
                        payload.length,
                        null,
                        "bytes",
                        null);
        when(driveClient.openStream(
                        activeDrive, "gfile-123", "application/octet-stream", "bytes=0-10"))
                .thenReturn(expectedStream);

        String dlUrl =
                hybrid.createSignedDownloadUrl("missions/77/flight.bin", Duration.ofMinutes(10));
        assertThat(dlUrl).contains("/api/v1/storage/gateway/download");
        assertThat(hybrid.objectExists("missions/77/flight.bin")).isTrue();
        assertThat(hybrid.metadata("missions/77/flight.bin").size()).isEqualTo(payload.length);
        assertThat(hybrid.openStream("missions/77/flight.bin", "bytes=0-10"))
                .isSameAs(expectedStream);

        hybrid.deleteObject("missions/77/flight.bin");
        verify(driveClient).deleteFile(activeDrive, "gfile-123");
        verify(driveObjects).delete(mapped);

        // 3. Unmapped legacy R2 object transparently delegates to Cloudflare R2 without breakage
        when(driveObjects.existsByObjectKey("legacy/r2-photo.jpg")).thenReturn(false);
        when(driveObjects.findByObjectKey("legacy/r2-photo.jpg")).thenReturn(Optional.empty());
        when(r2.createSignedDownloadUrl("legacy/r2-photo.jpg", Duration.ofMinutes(15)))
                .thenReturn("https://r2.cloudflarestorage.com/legacy/r2-photo.jpg?sig=ok");
        when(r2.objectExists("legacy/r2-photo.jpg")).thenReturn(true);

        assertThat(hybrid.createSignedDownloadUrl("legacy/r2-photo.jpg"))
                .startsWith("https://r2.cloudflarestorage.com/");
        assertThat(hybrid.objectExists("legacy/r2-photo.jpg")).isTrue();
    }

    private void mockSetting(String key, String value) {
        SystemConfiguration cfg = new SystemConfiguration();
        cfg.setConfigKey(key);
        cfg.setConfigValue(value);
        when(settings.findByConfigKey(key)).thenReturn(Optional.of(cfg));
    }

    private static StorageDriveNode node(
            Long id,
            String code,
            String modules,
            long limit,
            long used,
            int maxPct,
            DriveNodeHealth health) {
        StorageDriveNode n = new StorageDriveNode();
        n.setId(id);
        n.setCode(code);
        n.setDisplayName(code);
        n.setAuthType(DriveAuthType.OAUTH2);
        n.setEncryptedCredentials("enc");
        n.setRoutedModules(modules);
        n.setPriorityWeight(100);
        n.setMaxUsagePercent(maxPct);
        n.setQuotaLimitBytes(limit);
        n.setQuotaUsedBytes(used);
        n.setHealthStatus(health);
        n.setEnabled(true);
        return n;
    }
}
