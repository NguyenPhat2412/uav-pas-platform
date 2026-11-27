package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.record.ObjectMetadata;
import com.uav.platform.dto.record.ObjectStream;
import com.uav.platform.dto.record.StorageUsage;

import org.junit.jupiter.api.Test;

import software.amazon.awssdk.awscore.exception.AwsErrorDetails;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.AbortableInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.PutBucketCorsRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.S3Object;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;

class S3CompatibleStorageServiceCoverageTest {

    private static S3CompatibleStorageService createWithMocks(
            String provider,
            boolean ensureBucket,
            String corsOrigin,
            String appCors,
            S3Client mockClient,
            S3Presigner mockPresigner)
            throws Exception {
        S3CompatibleStorageService service =
                new S3CompatibleStorageService(
                        provider,
                        "http://localhost:9000",
                        "uav-bucket",
                        "access",
                        "secret",
                        "us-east-1",
                        "https://cdn.uav.vn",
                        ensureBucket,
                        corsOrigin,
                        appCors);
        replaceField(service, "client", mockClient, true);
        if (mockPresigner != null) {
            replaceField(service, "presigner", mockPresigner, true);
        }
        return service;
    }

    private static void replaceField(
            S3CompatibleStorageService service, String name, Object replacement, boolean closeOld)
            throws Exception {
        Field field = S3CompatibleStorageService.class.getDeclaredField(name);
        field.setAccessible(true);
        Object previous = field.get(service);
        if (closeOld && previous instanceof AutoCloseable closeable) {
            closeable.close();
        }
        field.set(service, replacement);
    }

    private static S3Exception s3Error(int statusCode, String errorCode) {
        return (S3Exception)
                S3Exception.builder()
                        .statusCode(statusCode)
                        .awsErrorDetails(AwsErrorDetails.builder().errorCode(errorCode).build())
                        .message("err-" + statusCode)
                        .build();
    }

    @Test
    void constructorsAndOfflinePresigningWorkAcrossVariants() {
        S3CompatibleStorageService nineArg =
                new S3CompatibleStorageService(
                        "test", "", "bucket-a", "ak", "sk", "us-east-1", "", false, "");
        try {
            assertEquals("test", nineArg.provider());
            String up = nineArg.createSignedUploadUrl("image/a.png", "image/png");
            assertTrue(up.contains("image/a.png"));
            String upCustom =
                    nineArg.createSignedUploadUrl(
                            "image/b.png", "image/png", 128L, Duration.ofMinutes(5));
            assertTrue(upCustom.contains("image/b.png"));
            String down = nineArg.createSignedDownloadUrl("image/a.png");
            assertTrue(down.contains("image/a.png"));
            String downCustom =
                    nineArg.createSignedDownloadUrl("image/a.png", Duration.ofMinutes(3));
            assertTrue(downCustom.contains("image/a.png"));
        } finally {
            nineArg.closeClients();
        }

        S3CompatibleStorageService tenArgBlankCors =
                new S3CompatibleStorageService(
                        "r2",
                        "https://r2.uav.vn",
                        "bucket-b",
                        "ak",
                        "sk",
                        "us-east-1",
                        "https://pub.uav.vn",
                        false,
                        "",
                        "https://app.uav.vn");
        try {
            assertEquals("r2", tenArgBlankCors.provider());
        } finally {
            tenArgBlankCors.closeClients();
        }

        S3CompatibleStorageService tenArgMergedCors =
                new S3CompatibleStorageService(
                        "minio",
                        "http://localhost:9000",
                        "bucket-c",
                        "ak",
                        "sk",
                        "us-east-1",
                        "",
                        false,
                        "http://localhost:3000",
                        "https://portal.uav.vn");
        try {
            assertEquals("minio", tenArgMergedCors.provider());
        } finally {
            tenArgMergedCors.closeClients();
        }
    }

    @Test
    void bucketReachableAndUsageCoverPaginationAndTruncation() throws Exception {
        S3Client client = mock(S3Client.class);
        S3Presigner presigner = mock(S3Presigner.class);
        S3CompatibleStorageService service =
                createWithMocks("minio", false, "", "", client, presigner);

        when(client.headBucket(any(HeadBucketRequest.class)))
                .thenReturn(HeadBucketResponse.builder().build());
        assertTrue(service.bucketReachable());

        when(client.headBucket(any(HeadBucketRequest.class)))
                .thenThrow(new RuntimeException("down"));
        assertFalse(service.bucketReachable());

        // Multi-page listing with null size on one item
        ListObjectsV2Response page1 =
                ListObjectsV2Response.builder()
                        .contents(
                                S3Object.builder().key("a").size(100L).build(),
                                S3Object.builder().key("b").build())
                        .isTruncated(true)
                        .nextContinuationToken("tok-1")
                        .build();
        ListObjectsV2Response page2 =
                ListObjectsV2Response.builder()
                        .contents(S3Object.builder().key("c").size(50L).build())
                        .isTruncated(false)
                        .build();
        when(client.listObjectsV2(any(ListObjectsV2Request.class)))
                .thenReturn(page1)
                .thenReturn(page2);

        StorageUsage full = service.usage(10);
        assertEquals(3, full.objectCount());
        assertEquals(150L, full.totalBytes());
        assertFalse(full.truncated());

        // Truncated early when count >= maxObjects
        when(client.listObjectsV2(any(ListObjectsV2Request.class))).thenReturn(page1);
        StorageUsage truncated = service.usage(2);
        assertEquals(2, truncated.objectCount());
        assertEquals(100L, truncated.totalBytes());
        assertTrue(truncated.truncated());

        service.closeClients();
        verify(presigner).close();
        verify(client).close();
    }

    @Test
    void initializeBucketCoversEnsureDisabledEnabledAndCorsBranches() throws Exception {
        S3Client testClient = mock(S3Client.class);
        S3CompatibleStorageService testSvc =
                createWithMocks(
                        "test", false, "http://a.com", "", testClient, mock(S3Presigner.class));
        testSvc.initializeBucket();
        verifyNoInteractions(testClient);

        // ensureBucket=false, non-test, blank / comma-only CORS -> skips putBucketCors
        S3Client blankCorsClient = mock(S3Client.class);
        S3CompatibleStorageService blankCorsSvc =
                createWithMocks(
                        "minio", false, " , , ", "", blankCorsClient, mock(S3Presigner.class));
        blankCorsSvc.initializeBucket();
        verifyNoInteractions(blankCorsClient);

        // ensureBucket=false, non-test, CORS throws RuntimeException -> swallowed
        S3Client bestEffortClient = mock(S3Client.class);
        when(bestEffortClient.putBucketCors(any(PutBucketCorsRequest.class)))
                .thenThrow(new RuntimeException("cors fail"));
        S3CompatibleStorageService bestEffortSvc =
                createWithMocks(
                        "minio",
                        false,
                        "http://a.com, , http://b.com",
                        "",
                        bestEffortClient,
                        mock(S3Presigner.class));
        assertDoesNotThrow(bestEffortSvc::initializeBucket);
        verify(bestEffortClient).putBucketCors(any(PutBucketCorsRequest.class));

        // ensureBucket=true, headBucket succeeds, putBucketCors throws 501 then 403 -> swallowed
        S3Client existingClient = mock(S3Client.class);
        when(existingClient.headBucket(any(HeadBucketRequest.class)))
                .thenReturn(HeadBucketResponse.builder().build());
        when(existingClient.putBucketCors(any(PutBucketCorsRequest.class)))
                .thenThrow(s3Error(501, "NotImplemented"))
                .thenThrow(s3Error(403, "AccessDenied"))
                .thenThrow(s3Error(500, "InternalError"));
        S3CompatibleStorageService existingSvc =
                createWithMocks(
                        "minio", true, "http://a.com", "", existingClient, mock(S3Presigner.class));
        assertDoesNotThrow(existingSvc::initializeBucket);
        assertDoesNotThrow(existingSvc::initializeBucket);
        assertThrows(S3Exception.class, existingSvc::initializeBucket);

        // ensureBucket=true, headBucket 404 -> createBucket + applyCors
        S3Client missing404Client = mock(S3Client.class);
        when(missing404Client.headBucket(any(HeadBucketRequest.class)))
                .thenThrow(s3Error(404, "NotFound"));
        S3CompatibleStorageService missing404Svc =
                createWithMocks(
                        "minio",
                        true,
                        "http://a.com",
                        "",
                        missing404Client,
                        mock(S3Presigner.class));
        missing404Svc.initializeBucket();
        verify(missing404Client).createBucket(any(CreateBucketRequest.class));
        verify(missing404Client).putBucketCors(any(PutBucketCorsRequest.class));

        // ensureBucket=true, headBucket NoSuchBucket (non-404 status) -> createBucket
        S3Client noSuchClient = mock(S3Client.class);
        when(noSuchClient.headBucket(any(HeadBucketRequest.class)))
                .thenThrow(s3Error(400, "NoSuchBucket"));
        S3CompatibleStorageService noSuchSvc =
                createWithMocks("minio", true, "", "", noSuchClient, mock(S3Presigner.class));
        noSuchSvc.initializeBucket();
        verify(noSuchClient).createBucket(any(CreateBucketRequest.class));

        // ensureBucket=true, headBucket 500 -> rethrows
        S3Client errorClient = mock(S3Client.class);
        when(errorClient.headBucket(any(HeadBucketRequest.class)))
                .thenThrow(s3Error(500, "InternalError"));
        S3CompatibleStorageService errorSvc =
                createWithMocks("minio", true, "", "", errorClient, mock(S3Presigner.class));
        assertThrows(S3Exception.class, errorSvc::initializeBucket);
    }

    @Test
    void objectOperationsCoverExistsMetadataHeaderDeleteUploadAndStreamAbort() throws Exception {
        S3Client client = mock(S3Client.class);
        S3CompatibleStorageService service =
                createWithMocks("minio", false, "", "", client, mock(S3Presigner.class));

        // objectExists: true, 404 -> false, 500 -> rethrow
        when(client.headObject(any(HeadObjectRequest.class)))
                .thenReturn(
                        HeadObjectResponse.builder()
                                .contentLength(42L)
                                .contentType("image/png")
                                .build())
                .thenThrow(s3Error(404, "NoSuchKey"))
                .thenThrow(s3Error(500, "ServerError"));
        assertTrue(service.objectExists("k1"));
        assertFalse(service.objectExists("k2"));
        assertThrows(S3Exception.class, () -> service.objectExists("k3"));

        // metadata
        when(client.headObject(any(HeadObjectRequest.class)))
                .thenReturn(
                        HeadObjectResponse.builder()
                                .contentLength(1024L)
                                .contentType("application/pdf")
                                .build());
        ObjectMetadata meta = service.metadata("doc/a.pdf");
        assertEquals(1024L, meta.size());
        assertEquals("application/pdf", meta.contentType());

        // readHeader success + abort
        AtomicBoolean aborted1 = new AtomicBoolean(false);
        ResponseInputStream<GetObjectResponse> okStream =
                new ResponseInputStream<>(
                        GetObjectResponse.builder().build(),
                        AbortableInputStream.create(
                                new ByteArrayInputStream(new byte[] {1, 2, 3, 4}),
                                () -> aborted1.set(true)));
        when(client.getObject(any(GetObjectRequest.class))).thenReturn(okStream);
        assertArrayEquals(new byte[] {1, 2, 3, 4}, service.readHeader("doc/a.pdf"));
        assertTrue(aborted1.get());

        // readHeader IOException -> IllegalStateException + abort
        AtomicBoolean aborted2 = new AtomicBoolean(false);
        InputStream failingIn =
                new InputStream() {
                    @Override
                    public int read() throws IOException {
                        throw new IOException("boom");
                    }
                };
        ResponseInputStream<GetObjectResponse> badStream =
                new ResponseInputStream<>(
                        GetObjectResponse.builder().build(),
                        AbortableInputStream.create(failingIn, () -> aborted2.set(true)));
        when(client.getObject(any(GetObjectRequest.class))).thenReturn(badStream);
        assertThrows(IllegalStateException.class, () -> service.readHeader("doc/bad.pdf"));
        assertTrue(aborted2.get());

        // deleteObject & uploadObject
        service.deleteObject("doc/a.pdf");
        verify(client).deleteObject(any(DeleteObjectRequest.class));

        service.uploadObject(
                "doc/a.pdf", "application/pdf", 3L, new ByteArrayInputStream(new byte[] {1, 2, 3}));
        verify(client).putObject(any(PutObjectRequest.class), any(RequestBody.class));

        // openStream with range and full single-byte read until EOF -> close() closes (does not
        // abort)
        AtomicBoolean aborted3 = new AtomicBoolean(false);
        ResponseInputStream<GetObjectResponse> s3Full =
                new ResponseInputStream<>(
                        GetObjectResponse.builder()
                                .contentType("video/mp4")
                                .contentLength(2L)
                                .contentRange("bytes 0-1/10")
                                .acceptRanges("bytes")
                                .eTag("\"e1\"")
                                .build(),
                        AbortableInputStream.create(
                                new ByteArrayInputStream(new byte[] {7, 8}),
                                () -> aborted3.set(true)));
        when(client.getObject(any(GetObjectRequest.class))).thenReturn(s3Full);
        ObjectStream stream1 = service.openStream("video/a.mp4", " bytes=0-1 ");
        assertEquals("video/mp4", stream1.contentType());
        assertEquals(2L, stream1.contentLength());
        assertEquals("bytes 0-1/10", stream1.contentRange());
        assertEquals("bytes", stream1.acceptRanges());
        assertEquals("\"e1\"", stream1.eTag());
        assertEquals(7, stream1.body().read());
        assertEquals(8, stream1.body().read());
        assertEquals(-1, stream1.body().read());
        stream1.body().close();
        stream1.body().close(); // idempotent second close
        assertFalse(aborted3.get());

        // openStream without range, null contentLength & blank acceptRanges -> early close aborts
        AtomicBoolean aborted4 = new AtomicBoolean(false);
        ResponseInputStream<GetObjectResponse> s3Partial =
                new ResponseInputStream<>(
                        GetObjectResponse.builder()
                                .contentType("application/pdf")
                                .acceptRanges(" ")
                                .build(),
                        AbortableInputStream.create(
                                new ByteArrayInputStream(new byte[] {1, 2, 3, 4}),
                                () -> aborted4.set(true)));
        when(client.getObject(any(GetObjectRequest.class))).thenReturn(s3Partial);
        ObjectStream stream2 = service.openStream("doc/a.pdf", " ");
        assertEquals(-1L, stream2.contentLength());
        assertEquals("bytes", stream2.acceptRanges());
        byte[] buf = new byte[2];
        assertEquals(2, stream2.body().read(buf, 0, 2));
        stream2.body().close();
        assertTrue(aborted4.get());

        // openStream reading exact expected length via read(byte[], off, len) + 0-len read ->
        // closes cleanly
        AtomicBoolean aborted5 = new AtomicBoolean(false);
        ResponseInputStream<GetObjectResponse> s3Exact =
                new ResponseInputStream<>(
                        GetObjectResponse.builder().contentLength(3L).build(),
                        AbortableInputStream.create(
                                new ByteArrayInputStream(new byte[] {9, 8, 7}),
                                () -> aborted5.set(true)));
        when(client.getObject(any(GetObjectRequest.class))).thenReturn(s3Exact);
        ObjectStream stream3 = service.openStream("doc/b.pdf", null);
        assertEquals(0, stream3.body().read(new byte[4], 0, 0));
        byte[] all = new byte[3];
        assertEquals(3, stream3.body().read(all, 0, 3));
        assertEquals(-1, stream3.body().read(all, 0, 3));
        stream3.body().close();
        assertFalse(aborted5.get());
    }
}
