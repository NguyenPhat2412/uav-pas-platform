package com.uav.platform.service.impl.storage.pool;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.settings.ISystemConfigurationDao;
import com.uav.platform.dao.storage.IStorageDriveNodeDao;
import com.uav.platform.entity.settings.SystemConfiguration;
import com.uav.platform.entity.storage.StorageDriveNode;
import com.uav.platform.enums.storage.DriveAllocationStrategy;
import com.uav.platform.enums.storage.DriveNodeHealth;
import com.uav.platform.enums.storage.StorageBackendMode;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

class StorageAllocationOperationsCoverageTest {

    private IStorageDriveNodeDao driveNodes;
    private ISystemConfigurationDao settings;
    private StorageAllocationOperations ops;

    @BeforeEach
    void setUp() {
        driveNodes = mock(IStorageDriveNodeDao.class);
        settings = mock(ISystemConfigurationDao.class);
        ops =
                new StorageAllocationOperations(
                        driveNodes, settings, "test-secret", "https://api.uav.vn");
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    private void stubSetting(String key, String value) {
        SystemConfiguration cfg = new SystemConfiguration();
        cfg.setConfigKey(key);
        cfg.setConfigValue(value);
        when(settings.findByConfigKey(key)).thenReturn(Optional.of(cfg));
    }

    private static StorageDriveNode node(
            Long id,
            String code,
            String modules,
            int priority,
            Long limit,
            Long used,
            int maxPct,
            DriveNodeHealth health) {
        StorageDriveNode n = new StorageDriveNode();
        n.setId(id);
        n.setCode(code);
        n.setRoutedModules(modules);
        n.setPriorityWeight(priority);
        n.setQuotaLimitBytes(limit);
        n.setQuotaUsedBytes(used);
        n.setMaxUsagePercent(maxPct);
        n.setHealthStatus(health);
        return n;
    }

    @Test
    void settingsReadersFallbackOnInvalidOrRuntimeErrors() {
        StorageAllocationOperations defaults =
                new StorageAllocationOperations(driveNodes, settings, "  ", "");
        assertEquals("http://localhost:8080", defaults.baseUriBuilder().toUriString());

        stubSetting(StorageAllocationOperations.KEY_PRIMARY_BACKEND, "INVALID");
        assertEquals(StorageBackendMode.GOOGLE_DRIVE, ops.primaryBackend());

        stubSetting(StorageAllocationOperations.KEY_ALLOCATION_STRATEGY, "BAD");
        assertEquals(DriveAllocationStrategy.MOST_FREE_SPACE, ops.allocationStrategy());

        stubSetting(StorageAllocationOperations.KEY_TIERED_SMALL_MAX, "not-a-number");
        assertEquals(5_242_880L, ops.tieredSmallFileMaxBytes());

        stubSetting(StorageAllocationOperations.KEY_FALLBACK_R2, "false");
        assertFalse(ops.fallbackToR2());

        // DAO throws RuntimeException -> falls back to default
        when(settings.findByConfigKey(StorageAllocationOperations.KEY_PRIMARY_BACKEND))
                .thenThrow(new RuntimeException("db error"));
        assertEquals(StorageBackendMode.GOOGLE_DRIVE, ops.primaryBackend());
    }

    @Test
    void shouldRouteSmallFileToR2AndSelectNodeCoverAllStrategies() {
        // R2 primary -> never selects a Drive node
        stubSetting(StorageAllocationOperations.KEY_PRIMARY_BACKEND, "R2");
        assertFalse(ops.shouldRouteSmallFileToR2("image/png", 1024));
        assertTrue(ops.selectNode("image/a.png", "image/png", 1024).isEmpty());

        // HYBRID_TIERED small image vs large image vs pdf vs zero size
        stubSetting(StorageAllocationOperations.KEY_PRIMARY_BACKEND, "HYBRID_TIERED");
        stubSetting(StorageAllocationOperations.KEY_TIERED_SMALL_MAX, "1000");
        assertTrue(ops.shouldRouteSmallFileToR2("image/jpeg", 500));
        assertFalse(ops.shouldRouteSmallFileToR2("image/jpeg", 0));
        assertFalse(ops.shouldRouteSmallFileToR2("image/jpeg", 2000));
        assertFalse(ops.shouldRouteSmallFileToR2("application/pdf", 500));
        assertTrue(ops.selectNode("image/a.jpg", "image/jpeg", 500).isEmpty());

        // No enabled nodes
        stubSetting(StorageAllocationOperations.KEY_PRIMARY_BACKEND, "GOOGLE_DRIVE");
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc()).thenReturn(List.of());
        assertTrue(ops.selectNode("video/a.mp4", "video/mp4", 100).isEmpty());

        // All nodes DOWN or full -> empty
        StorageDriveNode down = node(1L, "down", "ALL", 100, 1000L, 0L, 90, DriveNodeHealth.DOWN);
        StorageDriveNode full = node(2L, "full", "ALL", 100, 1000L, 950L, 90, DriveNodeHealth.UP);
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(down, full));
        assertTrue(ops.selectNode("video/a.mp4", "video/mp4", 100).isEmpty());

        // Relaxed module fallback: only GENERAL/ALL node has space for TRAINING key
        StorageDriveNode videoOnlyFull =
                node(3L, "vid", "TRAINING", 200, 100L, 95L, 90, DriveNodeHealth.UP);
        StorageDriveNode general = node(4L, "gen", "ALL", 50, 10_000L, 0L, 90, DriveNodeHealth.UP);
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(videoOnlyFull, general));
        assertEquals(
                "gen",
                ops.selectNode("training/guide.pdf", "application/pdf", 100)
                        .orElseThrow()
                        .getCode());

        // ROUND_ROBIN strategy
        StorageDriveNode n1 = node(1L, "n1", "ALL", 10, 1000L, 100L, 95, DriveNodeHealth.UP);
        StorageDriveNode n2 = node(2L, "n2", "ALL", 10, 1000L, 100L, 95, DriveNodeHealth.UP);
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(n1, n2));
        stubSetting(StorageAllocationOperations.KEY_ALLOCATION_STRATEGY, "ROUND_ROBIN");
        assertEquals("n1", ops.selectNode("other/x", null, 10).orElseThrow().getCode());
        assertEquals("n2", ops.selectNode("other/x", null, 10).orElseThrow().getCode());
        assertEquals("n1", ops.selectNode("other/x", null, 10).orElseThrow().getCode());

        // MODULE_PRIORITY strategy: explicit match beats ALL even with lower priority
        StorageDriveNode allHigh =
                node(10L, "all-hi", "ALL", 500, 10_000L, 0L, 95, DriveNodeHealth.UP);
        StorageDriveNode explicitLow =
                node(11L, "doc-lo", "DOCUMENT", 10, 5_000L, 0L, 95, DriveNodeHealth.UP);
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(allHigh, explicitLow));
        stubSetting(StorageAllocationOperations.KEY_ALLOCATION_STRATEGY, "MODULE_PRIORITY");
        assertEquals(
                "doc-lo",
                ops.selectNode("document/spec.pdf", "application/pdf", 10).orElseThrow().getCode());

        // MOST_FREE_SPACE strategy with unlimited node (limit == null)
        StorageDriveNode limited =
                node(20L, "lim", "ALL", 200, 1000L, 100L, 95, DriveNodeHealth.UP);
        StorageDriveNode unlimited =
                node(null, "unlim", "", 10, null, null, 95, DriveNodeHealth.UP);
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(limited, unlimited));
        stubSetting(StorageAllocationOperations.KEY_ALLOCATION_STRATEGY, "MOST_FREE_SPACE");
        assertEquals("unlim", ops.selectNode("x/y", null, 50).orElseThrow().getCode());
    }

    @Test
    void helpersCoverCapacityRouteTagModuleMatchingAndHmacSignatures() {
        // hasCapacity & effectiveFreeBytes
        StorageDriveNode unlim = node(1L, "u", "", 1, 0L, null, 10, DriveNodeHealth.UP);
        assertTrue(StorageAllocationOperations.hasCapacity(unlim, 999999));
        assertEquals(Long.MAX_VALUE / 2, StorageAllocationOperations.effectiveFreeBytes(unlim));

        StorageDriveNode capped = node(2L, "c", "", 1, 1000L, 400L, 30, DriveNodeHealth.UP);
        // capPct clamped to 50 -> 400 + 100 = 500 (50% <= 50%) true; + 101 false; + 700 (> limit)
        // false
        assertTrue(StorageAllocationOperations.hasCapacity(capped, 100));
        assertFalse(StorageAllocationOperations.hasCapacity(capped, 101));
        assertFalse(StorageAllocationOperations.hasCapacity(capped, 700));
        assertEquals(600L, StorageAllocationOperations.effectiveFreeBytes(capped));

        // inferRouteTag
        assertEquals("TRAINING", StorageAllocationOperations.inferRouteTag("training/a.pdf", null));
        assertEquals(
                "MISSION_MEDIA", StorageAllocationOperations.inferRouteTag("mission/1.jpg", null));
        assertEquals(
                "MISSION_MEDIA", StorageAllocationOperations.inferRouteTag("missions/1.jpg", null));
        assertEquals("VIDEO", StorageAllocationOperations.inferRouteTag("video/1.mp4", null));
        assertEquals("DOCUMENT", StorageAllocationOperations.inferRouteTag("document/1.pdf", null));
        assertEquals("IMAGE", StorageAllocationOperations.inferRouteTag("image/1.png", null));
        assertEquals("VIDEO", StorageAllocationOperations.inferRouteTag("misc/x", "video/webm"));
        assertEquals("IMAGE", StorageAllocationOperations.inferRouteTag("misc/x", "image/webp"));
        assertEquals(
                "DOCUMENT", StorageAllocationOperations.inferRouteTag("misc/x", "application/pdf"));
        assertEquals(
                "GENERAL",
                StorageAllocationOperations.inferRouteTag(" ", "application/octet-stream"));

        // matchesModule
        assertTrue(StorageAllocationOperations.matchesModule(null, "VIDEO"));
        assertTrue(StorageAllocationOperations.matchesModule(" , ", "VIDEO"));
        assertTrue(StorageAllocationOperations.matchesModule("ALL", "VIDEO"));
        assertTrue(StorageAllocationOperations.matchesModule("IMAGE, VIDEO", "VIDEO"));
        assertFalse(StorageAllocationOperations.matchesModule("IMAGE", "VIDEO"));

        // Signed gateway URLs without and with RequestContextHolder
        String upUrl = ops.buildSignedGatewayUploadUrl("drv-1", "img/a.png", " ", 123L, null);
        assertTrue(upUrl.startsWith("https://api.uav.vn"));
        assertTrue(upUrl.contains("application/octet-stream"));

        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setScheme("https");
        req.setServerName("portal.uav.vn");
        req.setServerPort(443);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(req));
        String dlUrl = ops.buildSignedGatewayDownloadUrl("img/a.png", Duration.ofMinutes(10));
        assertTrue(dlUrl.startsWith("https://portal.uav.vn"));

        // Upload signature verification
        long futureExp = Instant.now().plusSeconds(300).getEpochSecond();
        long pastExp = Instant.now().minusSeconds(10).getEpochSecond();
        String upSig = ops.signUpload(null, "k1", null, 10L, futureExp);
        assertTrue(
                ops.verifyUploadSignature(null, "k1", null, 10L, futureExp, upSig.toUpperCase()));
        assertFalse(ops.verifyUploadSignature(null, " ", null, 10L, futureExp, upSig));
        assertFalse(ops.verifyUploadSignature(null, "k1", null, 10L, null, upSig));
        assertFalse(ops.verifyUploadSignature(null, "k1", null, 10L, futureExp, " "));
        assertFalse(ops.verifyUploadSignature(null, "k1", null, 10L, pastExp, upSig));
        assertFalse(ops.verifyUploadSignature(null, "k1", null, 10L, futureExp, "deadbeef"));

        // Download signature verification
        String dlSig = ops.signDownload("k1", futureExp);
        assertTrue(ops.verifyDownloadSignature("k1", futureExp, dlSig));
        assertFalse(ops.verifyDownloadSignature("", futureExp, dlSig));
        assertFalse(ops.verifyDownloadSignature("k1", null, dlSig));
        assertFalse(ops.verifyDownloadSignature("k1", futureExp, ""));
        assertFalse(ops.verifyDownloadSignature("k1", pastExp, dlSig));
        assertFalse(ops.verifyDownloadSignature("k1", futureExp, "wrong"));

        // OAuth state verification
        String oauthSig = ops.signOAuthState("node=1");
        assertTrue(ops.verifyOAuthState("node=1", oauthSig));
        assertFalse(ops.verifyOAuthState("", oauthSig));
        assertFalse(ops.verifyOAuthState("node=1", ""));
        assertFalse(ops.verifyOAuthState("node=1", "bad"));
    }
}
