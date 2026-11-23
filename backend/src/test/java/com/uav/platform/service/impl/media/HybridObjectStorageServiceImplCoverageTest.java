package com.uav.platform.service.impl.media;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.storage.IStorageDriveNodeDao;
import com.uav.platform.dao.storage.IStorageDriveObjectDao;
import com.uav.platform.dto.record.media.ObjectMetadata;
import com.uav.platform.dto.record.media.ObjectStream;
import com.uav.platform.dto.record.media.StorageUsage;
import com.uav.platform.dto.record.storage.pool.DriveUploadedFile;
import com.uav.platform.entity.storage.StorageDriveNode;
import com.uav.platform.entity.storage.StorageDriveObject;
import com.uav.platform.enums.storage.DriveNodeHealth;
import com.uav.platform.enums.storage.StorageBackendMode;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.impl.security.DocumentEncryptionServiceImpl;
import com.uav.platform.service.impl.storage.pool.GoogleDriveClientOperations;
import com.uav.platform.service.impl.storage.pool.StorageAllocationOperations;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

class HybridObjectStorageServiceImplCoverageTest {

    private S3CompatibleStorageService r2Delegate;
    private IStorageDriveNodeDao driveNodes;
    private IStorageDriveObjectDao driveObjects;
    private StorageAllocationOperations allocator;
    private GoogleDriveClientOperations driveClient;
    private HybridObjectStorageServiceImpl service;

    @BeforeEach
    void setUp() {
        r2Delegate = mock(S3CompatibleStorageService.class);
        driveNodes = mock(IStorageDriveNodeDao.class);
        driveObjects = mock(IStorageDriveObjectDao.class);
        allocator = mock(StorageAllocationOperations.class);
        driveClient = mock(GoogleDriveClientOperations.class);
        service =
                new HybridObjectStorageServiceImpl(
                        r2Delegate, driveNodes, driveObjects, allocator, driveClient);
    }

    private static StorageDriveNode node(String code, Long used, DriveNodeHealth health) {
        StorageDriveNode n = new StorageDriveNode();
        n.setCode(code);
        n.setQuotaUsedBytes(used);
        n.setHealthStatus(health);
        return n;
    }

    private static StorageDriveObject driveObj(
            StorageDriveNode node, String key, String ct, long size) {
        StorageDriveObject obj = new StorageDriveObject();
        obj.setNode(node);
        obj.setObjectKey(key);
        obj.setDriveFileId("file-1");
        obj.setContentType(ct);
        obj.setSizeBytes(size);
        return obj;
    }

    @Test
    void lifecycleSpringConstructorAndProviderRouting() {
        service.init();
        verify(r2Delegate).initializeBucket();
        assertSame(r2Delegate, service.r2Delegate());
        service.shutdown();
        verify(r2Delegate).closeClients();

        HybridObjectStorageServiceImpl springCtor =
                new HybridObjectStorageServiceImpl(
                        "test",
                        "http://localhost:9000",
                        "uav-pas",
                        "ak",
                        "sk",
                        "us-east-1",
                        "",
                        false,
                        "",
                        "",
                        driveNodes,
                        driveObjects,
                        allocator,
                        driveClient);
        try {
            assertEquals("test", springCtor.r2Delegate().provider());
        } finally {
            springCtor.shutdown();
        }

        when(r2Delegate.provider()).thenReturn("r2");

        when(allocator.primaryBackend()).thenReturn(StorageBackendMode.R2);
        assertEquals("r2", service.provider());

        when(allocator.primaryBackend()).thenReturn(StorageBackendMode.GOOGLE_DRIVE);
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc()).thenReturn(List.of());
        assertEquals("r2", service.provider());

        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(node("n1", 0L, DriveNodeHealth.UP)));
        assertEquals("google-drive", service.provider());

        when(allocator.primaryBackend()).thenReturn(StorageBackendMode.HYBRID_TIERED);
        assertEquals("google-drive+r2", service.provider());
    }

    @Test
    void signedUploadUrlCoversDriveFallbackAndExhausted() {
        StorageDriveNode n = node("drv-1", 10L, DriveNodeHealth.UP);
        when(allocator.selectNode("img/a.png", "image/png", 0L)).thenReturn(Optional.of(n));
        when(allocator.buildSignedGatewayUploadUrl(
                        eq("drv-1"), eq("img/a.png"), eq("image/png"), eq(0L), any(Duration.class)))
                .thenReturn("https://gw/up");
        assertEquals("https://gw/up", service.createSignedUploadUrl("img/a.png", "image/png"));

        // Fallback to R2 when primary is R2
        when(allocator.selectNode("img/b.png", "image/png", 50L)).thenReturn(Optional.empty());
        when(allocator.primaryBackend()).thenReturn(StorageBackendMode.R2);
        when(r2Delegate.createSignedUploadUrl("img/b.png", "image/png", 50L, Duration.ofMinutes(5)))
                .thenReturn("https://r2/up");
        assertEquals(
                "https://r2/up",
                service.createSignedUploadUrl(
                        "img/b.png", "image/png", 50L, Duration.ofMinutes(5)));

        // Fallback to R2 when fallbackToR2 is true
        when(allocator.primaryBackend()).thenReturn(StorageBackendMode.GOOGLE_DRIVE);
        when(allocator.fallbackToR2()).thenReturn(true);
        assertEquals(
                "https://r2/up",
                service.createSignedUploadUrl(
                        "img/b.png", "image/png", 50L, Duration.ofMinutes(5)));

        // Exhausted when no fallback
        when(allocator.fallbackToR2()).thenReturn(false);
        assertThrows(
                SystemException.class,
                () ->
                        service.createSignedUploadUrl(
                                "img/b.png", "image/png", 50L, Duration.ofMinutes(5)));
    }

    @Test
    void uploadObjectCoversDriveEncryptionR2FallbackAndErrors() {
        // 1. Plain image uploaded to Drive node with quota tracking
        StorageDriveNode n1 = node("drv-1", 100L, DriveNodeHealth.UNKNOWN);
        when(allocator.selectNode("img/1.jpg", "image/jpeg", 4L)).thenReturn(Optional.of(n1));
        when(driveClient.uploadStream(eq(n1), eq("img/1.jpg"), eq("image/jpeg"), eq(4L), any()))
                .thenReturn(
                        new DriveUploadedFile("df1", "fld1", "IMAGE", "1.jpg", "image/jpeg", 4L));
        when(driveObjects.findByObjectKey("img/1.jpg")).thenReturn(Optional.empty());

        service.uploadObject(
                "img/1.jpg", "image/jpeg", 4L, new ByteArrayInputStream(new byte[] {1, 2, 3, 4}));

        assertEquals(104L, n1.getQuotaUsedBytes());
        assertEquals(DriveNodeHealth.UP, n1.getHealthStatus());
        verify(driveObjects).save(any(StorageDriveObject.class));
        verify(driveNodes).save(n1);

        // 2. Document PDF encrypted before Drive upload, with null quotaUsedBytes
        StorageDriveNode n2 = node("drv-2", null, DriveNodeHealth.UNKNOWN);
        when(allocator.selectNode(eq("doc/1.pdf"), eq("application/pdf"), anyLong()))
                .thenReturn(Optional.of(n2));
        when(driveObjects.findByObjectKey("doc/1.pdf")).thenReturn(Optional.empty());
        ArgumentCaptor<InputStream> streamCap = ArgumentCaptor.forClass(InputStream.class);
        when(driveClient.uploadStream(
                        eq(n2),
                        eq("doc/1.pdf"),
                        eq("application/pdf"),
                        anyLong(),
                        streamCap.capture()))
                .thenReturn(
                        new DriveUploadedFile(
                                "df2", "fld2", "DOC", "1.pdf", "application/pdf", 64L));

        byte[] plainPdf = "%PDF-1.7 test".getBytes(StandardCharsets.UTF_8);
        service.uploadObject(
                "doc/1.pdf",
                "application/pdf",
                plainPdf.length,
                new ByteArrayInputStream(plainPdf));
        assertNull(n2.getQuotaUsedBytes());

        // 3. Document read failure -> DOCUMENT_READ_FAILED
        InputStream broken =
                new InputStream() {
                    @Override
                    public int read() throws IOException {
                        throw new IOException("io err");
                    }
                };
        assertThrows(
                SystemException.class,
                () -> service.uploadObject("doc/bad.pdf", "application/pdf", 10L, broken));

        // 4. Fallback to R2
        when(allocator.selectNode("img/r2.png", "image/png", 2L)).thenReturn(Optional.empty());
        when(allocator.primaryBackend()).thenReturn(StorageBackendMode.R2);
        service.uploadObject(
                "img/r2.png", "image/png", 2L, new ByteArrayInputStream(new byte[] {1, 2}));
        verify(r2Delegate).uploadObject(eq("img/r2.png"), eq("image/png"), eq(2L), any());

        // 5. Exhausted without fallback
        when(allocator.primaryBackend()).thenReturn(StorageBackendMode.GOOGLE_DRIVE);
        when(allocator.fallbackToR2()).thenReturn(false);
        assertThrows(
                SystemException.class,
                () ->
                        service.uploadObject(
                                "img/r2.png",
                                "image/png",
                                2L,
                                new ByteArrayInputStream(new byte[] {1, 2})));
    }

    @Test
    void downloadExistsMetadataReadHeaderOpenStreamDecryptAndDeleteCoverAllBranches()
            throws Exception {
        StorageDriveNode n = node("drv-1", 500L, DriveNodeHealth.UP);
        StorageDriveObject mapped = driveObj(n, "doc/enc.pdf", "application/pdf", 200L);

        // createSignedDownloadUrl
        when(driveObjects.existsByObjectKey("doc/enc.pdf")).thenReturn(true);
        when(allocator.buildSignedGatewayDownloadUrl(eq("doc/enc.pdf"), any(Duration.class)))
                .thenReturn("https://gw/dl");
        assertEquals("https://gw/dl", service.createSignedDownloadUrl("doc/enc.pdf"));

        when(driveObjects.existsByObjectKey("r2/a.png")).thenReturn(false);
        when(r2Delegate.createSignedDownloadUrl(eq("r2/a.png"), any(Duration.class)))
                .thenReturn("https://r2/dl");
        assertEquals("https://r2/dl", service.createSignedDownloadUrl("r2/a.png"));

        // objectExists
        when(driveObjects.findByObjectKey("doc/enc.pdf")).thenReturn(Optional.of(mapped));
        when(driveClient.headFile(n, "file-1", "application/pdf"))
                .thenReturn(Optional.of(new ObjectMetadata(200L, "application/pdf")));
        assertTrue(service.objectExists("doc/enc.pdf"));

        when(driveObjects.findByObjectKey("r2/a.png")).thenReturn(Optional.empty());
        when(r2Delegate.objectExists("r2/a.png")).thenReturn(true);
        assertTrue(service.objectExists("r2/a.png"));

        // metadata (found on drive, missing on drive, fallback R2)
        assertEquals(200L, service.metadata("doc/enc.pdf").size());
        when(driveClient.headFile(n, "file-1", "application/pdf")).thenReturn(Optional.empty());
        assertThrows(SystemException.class, () -> service.metadata("doc/enc.pdf"));

        when(r2Delegate.metadata("r2/a.png")).thenReturn(new ObjectMetadata(55L, "image/png"));
        assertEquals(55L, service.metadata("r2/a.png").size());

        // readHeader
        when(driveClient.readHeader(n, "file-1", "application/pdf")).thenReturn(new byte[] {1, 2});
        assertArrayEquals(new byte[] {1, 2}, service.readHeader("doc/enc.pdf"));
        when(r2Delegate.readHeader("r2/a.png")).thenReturn(new byte[] {3, 4});
        assertArrayEquals(new byte[] {3, 4}, service.readHeader("r2/a.png"));

        // openStream: encrypted document -> transparently decrypted
        DocumentEncryptionServiceImpl enc = new DocumentEncryptionServiceImpl();
        byte[] plain = "%PDF-1.7 hello".getBytes(StandardCharsets.UTF_8);
        byte[] sealed = enc.encryptDocument(plain);
        when(driveClient.openStream(n, "file-1", "application/pdf", null))
                .thenReturn(
                        new ObjectStream(
                                new ByteArrayInputStream(sealed),
                                "application/pdf",
                                sealed.length,
                                null,
                                "bytes",
                                "e1"));
        ObjectStream decrypted = service.openStream("doc/enc.pdf", null);
        assertArrayEquals(plain, decrypted.body().readAllBytes());
        assertEquals(plain.length, decrypted.contentLength());

        // openStream: legacy unencrypted document -> passed through as-is
        when(driveClient.openStream(n, "file-1", "application/pdf", "bytes=0-5"))
                .thenReturn(
                        new ObjectStream(
                                new ByteArrayInputStream(plain),
                                "application/pdf",
                                plain.length,
                                null,
                                "bytes",
                                "e2"));
        ObjectStream legacy = service.openStream("doc/enc.pdf", "bytes=0-5");
        assertArrayEquals(plain, legacy.body().readAllBytes());

        // openStream: IOException during decrypt -> DOCUMENT_STREAM_DECRYPT_FAILED
        when(driveClient.openStream(n, "file-1", "application/pdf", "bad"))
                .thenReturn(
                        new ObjectStream(
                                new InputStream() {
                                    @Override
                                    public int read() throws IOException {
                                        throw new IOException("fail");
                                    }
                                },
                                "application/pdf",
                                10L,
                                null,
                                "bytes",
                                null));
        assertThrows(SystemException.class, () -> service.openStream("doc/enc.pdf", "bad"));

        // openStream: non-document on R2 + null stream / null body
        ObjectStream imgStream =
                new ObjectStream(
                        new ByteArrayInputStream(new byte[] {9}),
                        "image/png",
                        1L,
                        null,
                        "bytes",
                        null);
        when(r2Delegate.openStream("r2/a.png", null)).thenReturn(imgStream);
        assertSame(imgStream, service.openStream("r2/a.png", null));

        when(r2Delegate.openStream("r2/null", null)).thenReturn(null);
        assertNull(service.openStream("r2/null", null));

        // deleteObject: drive mapped (with quota decrement) + null quota + R2 fallback
        service.deleteObject("doc/enc.pdf");
        verify(driveClient).deleteFile(n, "file-1");
        verify(driveObjects).delete(mapped);
        assertEquals(300L, n.getQuotaUsedBytes());
        verify(driveNodes).save(n);

        n.setQuotaUsedBytes(null);
        service.deleteObject("doc/enc.pdf");
        verify(driveNodes, times(1)).save(n);

        service.deleteObject("r2/a.png");
        verify(r2Delegate).deleteObject("r2/a.png");
    }

    @Test
    void bucketReachableAndUsageCoverAllCombinations() {
        // Drive UP + non-R2 primary -> true without hitting R2
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(node("n1", 0L, DriveNodeHealth.UP)));
        when(allocator.primaryBackend()).thenReturn(StorageBackendMode.GOOGLE_DRIVE);
        assertTrue(service.bucketReachable());

        // All nodes DOWN -> falls through to R2
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(node("n1", 0L, DriveNodeHealth.DOWN)));
        when(r2Delegate.bucketReachable()).thenReturn(false);
        assertFalse(service.bucketReachable());

        // R2 primary -> delegates to R2 even if Drive is UP
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc())
                .thenReturn(List.of(node("n1", 0L, DriveNodeHealth.UP)));
        when(allocator.primaryBackend()).thenReturn(StorageBackendMode.R2);
        when(r2Delegate.bucketReachable()).thenReturn(true);
        assertTrue(service.bucketReachable());

        // usage: driveCount > 0 + R2 succeeds
        when(driveObjects.count()).thenReturn(3L);
        when(driveObjects.sumAllBytes()).thenReturn(300L);
        when(r2Delegate.usage(97L)).thenReturn(new StorageUsage(2L, 200L, true));
        StorageUsage combined = service.usage(100L);
        assertEquals(5L, combined.objectCount());
        assertEquals(500L, combined.totalBytes());
        assertTrue(combined.truncated());

        // usage: R2 throws when driveCount > 0 -> returns drive usage
        when(r2Delegate.usage(anyLong())).thenThrow(new RuntimeException("r2 down"));
        StorageUsage driveOnly = service.usage(100L);
        assertEquals(3L, driveOnly.objectCount());
        assertEquals(300L, driveOnly.totalBytes());
        assertFalse(driveOnly.truncated());

        // usage: driveCount == 0, active drive nodes present, R2 throws -> returns 0
        when(driveObjects.count()).thenReturn(0L);
        StorageUsage emptyDrive = service.usage(100L);
        assertEquals(0L, emptyDrive.objectCount());

        // usage: driveCount == 0, no drive nodes, R2 throws -> rethrows
        when(driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc()).thenReturn(List.of());
        assertThrows(RuntimeException.class, () -> service.usage(100L));
    }
}
