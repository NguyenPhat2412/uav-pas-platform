package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dao.IStorageDriveNodeDao;
import com.uav.platform.dao.IStorageDriveObjectDao;
import com.uav.platform.dao.ISystemConfigurationDao;
import com.uav.platform.dto.record.CandidateRow;
import com.uav.platform.dto.record.DriveAboutInfo;
import com.uav.platform.dto.record.DriveUploadedFile;
import com.uav.platform.dto.record.ObjectStream;
import com.uav.platform.dto.record.ServiceAccountParsed;
import com.uav.platform.dto.request.GoogleOAuthAuthorizeRequest;
import com.uav.platform.dto.request.GoogleOAuthConfigRequest;
import com.uav.platform.dto.request.StorageDriveNodeCreateRequest;
import com.uav.platform.dto.request.StorageDriveNodeUpdateRequest;
import com.uav.platform.dto.request.StoragePoolPolicyRequest;
import com.uav.platform.dto.request.StorageR2MigrationRequest;
import com.uav.platform.entity.MediaAsset;
import com.uav.platform.entity.StorageDriveNode;
import com.uav.platform.entity.SystemConfiguration;
import com.uav.platform.enums.DriveAllocationStrategy;
import com.uav.platform.enums.DriveAuthType;
import com.uav.platform.enums.DriveNodeHealth;
import com.uav.platform.enums.StorageBackendMode;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.AuditLogService;
import com.uav.platform.service.ObjectStorageService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

class StoragePoolServiceUnitTest {

    private JdbcTemplate jdbc;
    private IStorageDriveNodeDao driveNodes;
    private IStorageDriveObjectDao driveObjects;
    private IMediaAssetDao mediaAssets;
    private ISystemConfigurationDao settings;
    private StorageAllocationOperations allocator;
    private GoogleDriveClientOperations driveClient;
    private ObjectStorageService objectStorage;
    private AuditLogService audit;
    private NotificationBroadcastOperations notifications;
    private StoragePoolServiceImpl service;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        driveNodes = mock(IStorageDriveNodeDao.class);
        driveObjects = mock(IStorageDriveObjectDao.class);
        mediaAssets = mock(IMediaAssetDao.class);
        settings = mock(ISystemConfigurationDao.class);
        allocator = mock(StorageAllocationOperations.class);
        driveClient = mock(GoogleDriveClientOperations.class);
        objectStorage = mock(ObjectStorageService.class);
        audit = mock(AuditLogService.class);
        notifications = mock(NotificationBroadcastOperations.class);

        service =
                new StoragePoolServiceImpl(
                        jdbc,
                        driveNodes,
                        driveObjects,
                        mediaAssets,
                        settings,
                        allocator,
                        driveClient,
                        objectStorage,
                        audit,
                        "env-client-id-1234567890",
                        "env-secret",
                        "https://uav.all1.vn",
                        "https://admin.uav.all1.vn");
        ReflectionTestUtils.setField(service, "notificationBroadcast", notifications);

        when(allocator.primaryBackend()).thenReturn(StorageBackendMode.HYBRID_TIERED);
        when(allocator.allocationStrategy()).thenReturn(DriveAllocationStrategy.MOST_FREE_SPACE);
        when(allocator.fallbackToR2()).thenReturn(true);
        when(allocator.tieredSmallFileMaxBytes()).thenReturn(10_000_000L);
        when(allocator.baseUriBuilder())
                .thenAnswer(inv -> UriComponentsBuilder.fromUriString("https://uav.all1.vn"));
        when(jdbc.queryForMap(anyString())).thenReturn(Map.of("cnt", 2L, "total_bytes", 1024L));
    }

    @Test
    void overviewPolicyAndOAuthConfigAndAuthorizeAndCallbackWork() {
        StorageDriveNode node = new StorageDriveNode();
        node.setId(1L);
        node.setCode("gdrive-main");
        node.setDisplayName("Main Drive");
        node.setAuthType(DriveAuthType.OAUTH2);
        node.setEnabled(true);
        node.setHealthStatus(DriveNodeHealth.UP);
        node.setQuotaLimitBytes(10_000L);
        node.setQuotaUsedBytes(2_000L);
        node.setMaxUsagePercent(90);

        when(driveNodes.findAllByOrderByPriorityWeightDescIdAsc()).thenReturn(List.of(node));
        when(driveObjects.count()).thenReturn(3L);
        when(driveObjects.sumAllBytes()).thenReturn(1500L);
        when(driveObjects.countByNodeId(1L)).thenReturn(3L);
        when(driveObjects.sumBytesByNodeId(1L)).thenReturn(1500L);

        var overview = service.overview();
        assertEquals(1L, overview.driveActiveNodeCount());
        assertEquals(10_000L, overview.driveTotalLimitBytes());
        assertEquals(8_000L, overview.driveTotalFreeBytes());
        assertTrue(overview.oauthConfigured());

        // updatePolicy
        when(settings.findByConfigKey(anyString())).thenReturn(Optional.empty());
        service.updatePolicy(
                new StoragePoolPolicyRequest(
                        StorageBackendMode.GOOGLE_DRIVE,
                        DriveAllocationStrategy.MOST_FREE_SPACE,
                        false,
                        5_000_000L),
                "admin");
        verify(settings, atLeast(4)).save(any(SystemConfiguration.class));

        // saveOAuthConfig
        when(driveClient.encryptSecret("sec-1")).thenReturn("ENC_SEC");
        service.saveOAuthConfig(
                new GoogleOAuthConfigRequest(
                        "1234567890-abcdef.apps.googleusercontent.com", "sec-1"),
                "admin");

        // createOAuthAuthorizeUrl + completeOAuthCallback (success, cancel, failure)
        when(allocator.signOAuthState(anyString())).thenReturn("valid-sig");
        when(allocator.verifyOAuthState(anyString(), eq("valid-sig"))).thenReturn(true);
        when(driveClient.buildOAuthAuthorizeUrl(anyString(), anyString(), anyString()))
                .thenAnswer(
                        inv -> "https://accounts.google.com/o/oauth2?state=" + inv.getArgument(2));

        var authRes =
                service.createOAuthAuthorizeUrl(
                        new GoogleOAuthAuthorizeRequest(
                                "Drive A",
                                "root-1",
                                100,
                                90,
                                "media,training",
                                "https://admin.uav.all1.vn"),
                        "admin");
        String state =
                authRes.authorizeUrl().substring(authRes.authorizeUrl().indexOf("state=") + 6);

        // Cancel branch
        URI cancelled = service.completeOAuthCallback(null, state, "access_denied");
        assertTrue(cancelled.toString().contains("driveError=OAUTH_CANCELLED"));

        // Success branch
        when(driveClient.exchangeAuthorizationCode(any(), any(), eq("auth-code"), any()))
                .thenReturn("refresh-tok");
        when(driveClient.encryptOAuthCredentials(any(), any(), eq("refresh-tok")))
                .thenReturn("enc-cred");
        when(driveClient.fetchAbout(any()))
                .thenReturn(new DriveAboutInfo("ops@uav.vn", 50_000L, 5_000L, 4_000L));
        when(driveNodes.findByAccountEmailIgnoreCase("ops@uav.vn")).thenReturn(Optional.empty());
        when(driveNodes.save(any(StorageDriveNode.class)))
                .thenAnswer(
                        inv -> {
                            StorageDriveNode n = inv.getArgument(0);
                            n.setId(5L);
                            return n;
                        });
        URI okUri = service.completeOAuthCallback("auth-code", state, null);
        assertTrue(okUri.toString().contains("driveConnected="));

        // Failure branch inside exchange
        when(driveClient.exchangeAuthorizationCode(any(), any(), eq("bad-code"), any()))
                .thenThrow(SystemException.badRequest("bad", "TOKEN_ERR"));
        URI errUri = service.completeOAuthCallback("bad-code", state, null);
        assertTrue(errUri.toString().contains("driveError=TOKEN_ERR"));

        // Invalid state
        assertThrows(
                SystemException.class, () -> service.completeOAuthCallback("c", "badstate", null));
    }

    @Test
    void createUpdateSyncDeleteNodeAndMigrateR2Work() {
        // Service Account validation errors
        assertThrows(
                SystemException.class,
                () ->
                        service.createNode(
                                new StorageDriveNodeCreateRequest(
                                        "SA1",
                                        DriveAuthType.SERVICE_ACCOUNT,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        100,
                                        90,
                                        "ALL"),
                                "admin"));
        assertThrows(
                SystemException.class,
                () ->
                        service.createNode(
                                new StorageDriveNodeCreateRequest(
                                        "SA1",
                                        DriveAuthType.SERVICE_ACCOUNT,
                                        null,
                                        null,
                                        null,
                                        "{}",
                                        null,
                                        100,
                                        90,
                                        "ALL"),
                                "admin"));

        // Service Account happy path
        when(driveClient.encryptServiceAccountJson("{json}"))
                .thenReturn(new ServiceAccountParsed("sa@proj.iam.gserviceaccount.com", "enc-sa"));
        when(driveClient.fetchAbout(any()))
                .thenReturn(
                        new DriveAboutInfo(
                                "sa@proj.iam.gserviceaccount.com", 100_000L, 10_000L, 8_000L));
        when(driveNodes.save(any(StorageDriveNode.class)))
                .thenAnswer(
                        inv -> {
                            StorageDriveNode n = inv.getArgument(0);
                            if (n.getId() == null) n.setId(10L);
                            return n;
                        });
        var createdSa =
                service.createNode(
                        new StorageDriveNodeCreateRequest(
                                "SA Drive",
                                DriveAuthType.SERVICE_ACCOUNT,
                                null,
                                null,
                                null,
                                "{json}",
                                "folder-root",
                                100,
                                90,
                                "MEDIA"),
                        "admin");
        assertEquals("SA Drive", createdSa.displayName());

        // OAuth manual create + missing refresh token error
        assertThrows(
                SystemException.class,
                () ->
                        service.createNode(
                                new StorageDriveNodeCreateRequest(
                                        "OA1",
                                        DriveAuthType.OAUTH2,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        100,
                                        90,
                                        "ALL"),
                                "admin"));
        when(driveClient.encryptOAuthCredentials(any(), any(), eq("rt-1"))).thenReturn("enc-oa");
        var createdOa =
                service.createNode(
                        new StorageDriveNodeCreateRequest(
                                "OA Drive",
                                DriveAuthType.OAUTH2,
                                null,
                                null,
                                "rt-1",
                                null,
                                null,
                                80,
                                92,
                                "ALL"),
                        "admin");
        assertEquals("OA Drive", createdOa.displayName());

        // updateNode & syncNode (success + failure) & deleteNode (non-empty + empty)
        StorageDriveNode existing = new StorageDriveNode();
        existing.setId(10L);
        existing.setCode("gdrive-sa");
        existing.setDisplayName("SA Drive");
        existing.setEnabled(true);
        existing.setQuotaLimitBytes(100_000L);
        existing.setQuotaUsedBytes(10_000L);
        existing.setMaxUsagePercent(90);
        when(driveNodes.findById(10L)).thenReturn(Optional.of(existing));

        service.updateNode(
                10L,
                new StorageDriveNodeUpdateRequest("SA Updated", true, 120, 95, "ALL", "new-root"),
                "admin");
        verify(driveClient, atLeastOnce()).ensureRootFolder(existing);

        service.syncNode(10L, "admin");
        when(driveClient.fetchAbout(existing))
                .thenThrow(SystemException.badRequest("err", "SYNC_FAIL"));
        var downNode = service.syncNode(10L, "admin");
        assertEquals(DriveNodeHealth.DOWN, downNode.healthStatus());

        when(driveObjects.countByNodeId(10L)).thenReturn(2L);
        assertThrows(SystemException.class, () -> service.deleteNode(10L, "admin"));
        when(driveObjects.countByNodeId(10L)).thenReturn(0L);
        service.deleteNode(10L, "admin");
        verify(driveNodes).delete(existing);

        // migrateFromR2 & migrateSingleFile
        existing.setHealthStatus(DriveNodeHealth.UP);
        CandidateRow row = new CandidateRow("media/photo.jpg", "image/jpeg", 5L);
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of(row));
        when(allocator.selectNode(anyString(), anyString(), anyLong()))
                .thenReturn(Optional.of(existing));
        when(objectStorage.openStream("media/photo.jpg", null))
                .thenReturn(
                        new ObjectStream(
                                new ByteArrayInputStream("12345".getBytes(StandardCharsets.UTF_8)),
                                "image/jpeg",
                                5L,
                                null,
                                "bytes",
                                "e1"));
        when(driveClient.uploadStream(
                        eq(existing), eq("media/photo.jpg"), eq("image/jpeg"), eq(5L), any()))
                .thenReturn(
                        new DriveUploadedFile("df1", "f1", "media", "photo.jpg", "image/jpeg", 5L));
        when(mediaAssets.findByObjectKey("media/photo.jpg"))
                .thenReturn(Optional.of(new MediaAsset()));

        var migRes = service.migrateFromR2(new StorageR2MigrationRequest(10, true, 10L), "admin");
        assertEquals(1, migRes.migratedCount());
        verify(objectStorage).deleteObject("media/photo.jpg");

        // migrateSingleFile invalid ids & training/media branches
        assertThrows(
                SystemException.class, () -> service.migrateSingleFile("invalid", false, "admin"));
        assertThrows(
                SystemException.class,
                () -> service.migrateSingleFile("MEDIA:abc", false, "admin"));
        when(driveObjects.existsByObjectKey("media/photo.jpg")).thenReturn(true);
        var alreadyMigrated = service.migrateSingleFile("MEDIA:1", false, "admin");
        assertEquals(0, alreadyMigrated.migratedCount());
        when(driveObjects.existsByObjectKey("media/photo.jpg")).thenReturn(false);
        when(objectStorage.openStream("media/photo.jpg", null))
                .thenReturn(
                        new ObjectStream(
                                new ByteArrayInputStream("12345".getBytes(StandardCharsets.UTF_8)),
                                "image/jpeg",
                                5L,
                                null,
                                "bytes",
                                "e1"));
        var singleMigrated = service.migrateSingleFile("TRAINING:1", false, "admin");
        assertEquals(1, singleMigrated.migratedCount());
    }
}
