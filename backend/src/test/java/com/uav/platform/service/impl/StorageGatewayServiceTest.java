package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dao.IStorageDriveNodeDao;
import com.uav.platform.dao.IStorageDriveObjectDao;
import com.uav.platform.dto.record.DriveUploadedFile;
import com.uav.platform.dto.record.ObjectStream;
import com.uav.platform.entity.MediaAsset;
import com.uav.platform.entity.StorageDriveNode;
import com.uav.platform.entity.StorageDriveObject;
import com.uav.platform.error.SystemException;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

class StorageGatewayServiceTest {

    @Test
    void uploadSignedValidatesSignatureConflictNodeAndUpdatesMetadata() {
        StorageAllocationOperations allocator = mock(StorageAllocationOperations.class);
        IStorageDriveNodeDao nodes = mock(IStorageDriveNodeDao.class);
        IStorageDriveObjectDao objects = mock(IStorageDriveObjectDao.class);
        IMediaAssetDao mediaAssets = mock(IMediaAssetDao.class);
        GoogleDriveClientOperations driveClient = mock(GoogleDriveClientOperations.class);

        StorageGatewayServiceImpl service =
                new StorageGatewayServiceImpl(allocator, nodes, objects, mediaAssets, driveClient);

        // Invalid signature -> 403
        when(allocator.verifyUploadSignature(any(), any(), any(), anyLong(), any(), any()))
                .thenReturn(false);
        assertThrows(
                SystemException.class,
                () ->
                        service.uploadSigned(
                                "node-1",
                                "docs/a.pdf",
                                "",
                                5,
                                999L,
                                "bad",
                                null,
                                new ByteArrayInputStream(
                                        "hello".getBytes(StandardCharsets.UTF_8))));

        // Conflict when If-None-Match: *
        when(allocator.verifyUploadSignature(any(), any(), any(), anyLong(), any(), any()))
                .thenReturn(true);
        when(objects.existsByObjectKey("docs/a.pdf")).thenReturn(true);
        assertThrows(
                SystemException.class,
                () ->
                        service.uploadSigned(
                                "node-1",
                                "docs/a.pdf",
                                "application/pdf",
                                5,
                                999L,
                                "sig",
                                "*",
                                new ByteArrayInputStream(
                                        "hello".getBytes(StandardCharsets.UTF_8))));

        // Missing or disabled node -> 503
        when(objects.existsByObjectKey("docs/a.pdf")).thenReturn(false);
        when(nodes.findByCode("node-1")).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () ->
                        service.uploadSigned(
                                "node-1",
                                "docs/a.pdf",
                                "application/pdf",
                                5,
                                999L,
                                "sig",
                                "*",
                                new ByteArrayInputStream(
                                        "hello".getBytes(StandardCharsets.UTF_8))));

        StorageDriveNode node = new StorageDriveNode();
        node.setCode("node-1");
        node.setEnabled(false);
        when(nodes.findByCode("node-1")).thenReturn(Optional.of(node));
        assertThrows(
                SystemException.class,
                () ->
                        service.uploadSigned(
                                "node-1",
                                "docs/a.pdf",
                                "application/pdf",
                                5,
                                999L,
                                "sig",
                                null,
                                new ByteArrayInputStream(
                                        "hello".getBytes(StandardCharsets.UTF_8))));

        // Happy path + media asset provider tag update
        node.setEnabled(true);
        node.setQuotaUsedBytes(100L);
        when(driveClient.uploadStream(
                        eq(node), eq("docs/a.pdf"), eq("application/pdf"), eq(5L), any()))
                .thenAnswer(
                        inv -> {
                            var in = (java.io.InputStream) inv.getArgument(4);
                            assertEquals('h', in.read());
                            assertEquals(4, in.readAllBytes().length);
                            in.close();
                            return new DriveUploadedFile(
                                    "file-1", "folder-1", "docs", "a.pdf", "application/pdf", 5L);
                        });
        when(objects.findByObjectKey("docs/a.pdf")).thenReturn(Optional.empty());
        MediaAsset asset = new MediaAsset();
        when(mediaAssets.findByObjectKey("docs/a.pdf")).thenReturn(Optional.of(asset));

        service.uploadSigned(
                "node-1",
                "docs/a.pdf",
                "application/pdf",
                5,
                999L,
                "sig",
                null,
                new ByteArrayInputStream("hello-extra".getBytes(StandardCharsets.UTF_8)));

        verify(objects).save(any(StorageDriveObject.class));
        verify(nodes).save(node);
        assertEquals(105L, node.getQuotaUsedBytes());
        assertEquals("gdrive:node-1", asset.getStorageProvider());
    }

    @Test
    void downloadSignedHandlesHeadPartialFullAndErrors() throws Exception {
        StorageAllocationOperations allocator = mock(StorageAllocationOperations.class);
        IStorageDriveNodeDao nodes = mock(IStorageDriveNodeDao.class);
        IStorageDriveObjectDao objects = mock(IStorageDriveObjectDao.class);
        IMediaAssetDao mediaAssets = mock(IMediaAssetDao.class);
        GoogleDriveClientOperations driveClient = mock(GoogleDriveClientOperations.class);

        StorageGatewayServiceImpl service =
                new StorageGatewayServiceImpl(allocator, nodes, objects, mediaAssets, driveClient);

        when(allocator.verifyDownloadSignature("k", 1L, "bad")).thenReturn(false);
        assertThrows(
                SystemException.class, () -> service.downloadSigned("k", null, false, 1L, "bad"));

        when(allocator.verifyDownloadSignature("k", 1L, "ok")).thenReturn(true);
        when(objects.findByObjectKey("k")).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class, () -> service.downloadSigned("k", null, false, 1L, "ok"));

        StorageDriveNode node = new StorageDriveNode();
        StorageDriveObject obj = new StorageDriveObject();
        obj.setNode(node);
        obj.setDriveFileId("df-1");
        obj.setFileName("report.pdf");
        obj.setContentType("not/a/valid/mime");
        obj.setSizeBytes(12L);
        when(objects.findByObjectKey("k")).thenReturn(Optional.of(obj));

        // HEAD without range
        ResponseEntity<StreamingResponseBody> headRes =
                service.downloadSigned("k", null, true, 1L, "ok");
        assertEquals(HttpStatus.OK, headRes.getStatusCode());
        assertEquals(12L, headRes.getHeaders().getContentLength());

        // Partial HEAD with range
        when(driveClient.openStream(node, "df-1", "not/a/valid/mime", "bytes=0-3"))
                .thenReturn(
                        new ObjectStream(
                                new ByteArrayInputStream("abcd".getBytes(StandardCharsets.UTF_8)),
                                "application/pdf",
                                4L,
                                "bytes 0-3/12",
                                "bytes",
                                "\"etag-1\""));
        ResponseEntity<StreamingResponseBody> partialHead =
                service.downloadSigned("k", "bytes=0-3", true, 1L, "ok");
        assertEquals(HttpStatus.PARTIAL_CONTENT, partialHead.getStatusCode());

        // Full GET stream transfer
        when(driveClient.openStream(node, "df-1", "not/a/valid/mime", null))
                .thenReturn(
                        new ObjectStream(
                                new ByteArrayInputStream(
                                        "full-payload".getBytes(StandardCharsets.UTF_8)),
                                "application/pdf",
                                12L,
                                null,
                                "bytes",
                                "\"etag-2\""));
        ResponseEntity<StreamingResponseBody> getRes =
                service.downloadSigned("k", null, false, 1L, "ok");
        assertEquals(HttpStatus.OK, getRes.getStatusCode());
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        getRes.getBody().writeTo(out);
        assertEquals("full-payload", out.toString(StandardCharsets.UTF_8));
    }
}
