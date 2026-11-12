package com.uav.platform.service.media;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.service.impl.media.S3CompatibleStorageService;

import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

class S3CompatibleStorageServiceTest {
    @Test
    void ignoredRangeResponseIsAbortedWithoutDrainingLargeRemainder() throws Exception {
        int totalBytes = 32 * 1024 * 1024;
        var delivered = new java.util.concurrent.atomic.AtomicLong();
        var requestedRange = new java.util.concurrent.atomic.AtomicReference<String>();
        var finished = new java.util.concurrent.CountDownLatch(1);
        var executor = java.util.concurrent.Executors.newSingleThreadExecutor();
        var server =
                com.sun.net.httpserver.HttpServer.create(
                        new java.net.InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(executor);
        server.createContext(
                "/",
                exchange -> {
                    requestedRange.set(exchange.getRequestHeaders().getFirst("Range"));
                    // Deliberately ignore Range, as a misconfigured provider/proxy might.
                    exchange.sendResponseHeaders(200, totalBytes);
                    try (var body = exchange.getResponseBody()) {
                        byte[] block = new byte[4096];
                        java.util.Arrays.fill(block, (byte) 82);
                        for (int sent = 0; sent < totalBytes; sent += block.length) {
                            body.write(block);
                            delivered.addAndGet(block.length);
                        }
                    } catch (java.io.IOException disconnected) {
                        /* Expected when the client aborts. */
                    } finally {
                        exchange.close();
                        finished.countDown();
                    }
                });
        server.start();
        String endpoint = "http://127.0.0.1:" + server.getAddress().getPort();
        try {
            ObjectStorageService storage =
                    new S3CompatibleStorageService(
                            "minio",
                            endpoint,
                            "fixture",
                            "fixture-access",
                            "fixture-secret",
                            "us-east-1",
                            endpoint,
                            false,
                            "");
            byte[] header = storage.readHeader("large-object");
            assertEquals(64, header.length);
            for (byte value : header) assertEquals((byte) 82, value);
            assertEquals("bytes=0-63", requestedRange.get());
            assertTrue(
                    finished.await(10, java.util.concurrent.TimeUnit.SECONDS),
                    "response must be aborted promptly");
            // Transport buffers may prefetch, but the 32MB remainder must not be drained on close.
            assertTrue(delivered.get() < totalBytes, "provider remainder was fully drained");
        } finally {
            server.stop(0);
            executor.shutdownNow();
        }
    }

    @Test
    void signatureAuthenticatesThePublicHostWhenInternalEndpointDiffers() throws Exception {
        ObjectStorageService storage =
                new S3CompatibleStorageService(
                        "minio",
                        "http://minio:9000",
                        "uav",
                        "access",
                        "secret",
                        "us-east-1",
                        "http://localhost:9000",
                        false,
                        "http://localhost:3000");
        URI uri = URI.create(storage.createSignedDownloadUrl("document/test.txt"));
        String[] params = uri.getRawQuery().split("&");
        String signature =
                Arrays.stream(params)
                        .filter(p -> p.startsWith("X-Amz-Signature="))
                        .findFirst()
                        .orElseThrow()
                        .split("=", 2)[1];
        String canonicalQuery =
                String.join(
                        "&",
                        Arrays.stream(params)
                                .filter(p -> !p.startsWith("X-Amz-Signature="))
                                .sorted()
                                .toList());
        String date =
                Arrays.stream(params)
                        .filter(p -> p.startsWith("X-Amz-Date="))
                        .findFirst()
                        .orElseThrow()
                        .split("=", 2)[1];
        String credential =
                URLDecoder.decode(
                        Arrays.stream(params)
                                .filter(p -> p.startsWith("X-Amz-Credential="))
                                .findFirst()
                                .orElseThrow()
                                .split("=", 2)[1],
                        StandardCharsets.UTF_8);
        String scope = credential.substring(credential.indexOf('/') + 1);
        String canonical =
                "GET\n"
                        + uri.getRawPath()
                        + "\n"
                        + canonicalQuery
                        + "\nhost:"
                        + uri.getRawAuthority()
                        + "\n\nhost\nUNSIGNED-PAYLOAD";
        String stringToSign =
                "AWS4-HMAC-SHA256\n"
                        + date
                        + "\n"
                        + scope
                        + "\n"
                        + HexFormat.of()
                                .formatHex(
                                        MessageDigest.getInstance("SHA-256")
                                                .digest(
                                                        canonical.getBytes(
                                                                StandardCharsets.UTF_8)));
        byte[] key = hmac("AWS4secret".getBytes(StandardCharsets.UTF_8), date.substring(0, 8));
        key = hmac(key, "us-east-1");
        key = hmac(key, "s3");
        key = hmac(key, "aws4_request");
        assertEquals(signature, HexFormat.of().formatHex(hmac(key, stringToSign)));
    }

    private byte[] hmac(byte[] key, String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void createsExpiringSignedUrlsWithoutExposingCredentials() {
        ObjectStorageService storage =
                new S3CompatibleStorageService(
                        "minio",
                        "http://localhost:9000",
                        "uav",
                        "access",
                        "secret",
                        "us-east-1",
                        "http://localhost:9000",
                        false,
                        "http://localhost:3000");
        String url = storage.createSignedUploadUrl("image/file.png", "image/png");
        assertTrue(url.contains("X-Amz-Signature="));
        assertTrue(url.contains("X-Amz-Expires="));
        assertTrue(!url.contains("secret"));
    }
}
