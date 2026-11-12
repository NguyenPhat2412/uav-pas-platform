package com.uav.platform.stabilization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.uav.platform.service.media.ObjectStorageService;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/** Exercises the real signed-URL/object lifecycle against a disposable MinIO instance. */
@SpringBootTest
@EnabledIfEnvironmentVariable(named = "UAV_STABILIZATION_MINIO_ENDPOINT", matches = "https?://.+")
class StabilizationMinioTest {
    private static final String OBJECT_KEY = "stabilization/" + UUID.randomUUID() + ".txt";
    private static final byte[] CONTENT =
            "UAV PAS MinIO stabilization proof".getBytes(StandardCharsets.UTF_8);

    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry properties) {
        properties.add("app.storage.provider", () -> "minio");
        properties.add(
                "app.storage.endpoint", () -> System.getenv("UAV_STABILIZATION_MINIO_ENDPOINT"));
        properties.add(
                "app.storage.public-endpoint",
                () -> System.getenv("UAV_STABILIZATION_MINIO_ENDPOINT"));
        properties.add(
                "app.storage.access-key", () -> System.getenv("UAV_STABILIZATION_MINIO_USER"));
        properties.add(
                "app.storage.secret-key", () -> System.getenv("UAV_STABILIZATION_MINIO_PASSWORD"));
        properties.add(
                "app.storage.bucket",
                () -> System.getenv().getOrDefault("UAV_STABILIZATION_MINIO_BUCKET", "uav-phase1"));
        properties.add("app.storage.ensure-bucket", () -> true);
        properties.add("app.storage.cors-origin", () -> "http://localhost:3000");
    }

    @Autowired private ObjectStorageService storage;

    @AfterEach
    void cleanup() {
        if (storage.objectExists(OBJECT_KEY)) {
            storage.deleteObject(OBJECT_KEY);
        }
    }

    @Test
    void exactSignedSizeRejectsAutomaticLengthMismatchBeforePersistingAndKeepsConditionalPut()
            throws Exception {
        String key = "stabilization/size-" + UUID.randomUUID();
        try {
            String url =
                    storage.createSignedUploadUrl(
                            key, "image/png", 3, java.time.Duration.ofMinutes(15));
            var client = HttpClient.newHttpClient();
            // No manual Content-Length: the HTTP stack computes it, as a browser does for a File.
            for (byte[] bytes : new byte[][] {new byte[4], new byte[2]}) {
                int status =
                        client.send(
                                        HttpRequest.newBuilder(URI.create(url))
                                                .header("Content-Type", "image/png")
                                                .header("If-None-Match", "*")
                                                .PUT(HttpRequest.BodyPublishers.ofByteArray(bytes))
                                                .build(),
                                        HttpResponse.BodyHandlers.discarding())
                                .statusCode();
                assertTrue(status >= 400 && status < 500, "mismatched automatic length must fail");
                assertFalse(storage.objectExists(key));
            }
            int accepted =
                    client.send(
                                    HttpRequest.newBuilder(URI.create(url))
                                            .header("Content-Type", "image/png")
                                            .header("If-None-Match", "*")
                                            .PUT(
                                                    HttpRequest.BodyPublishers.ofByteArray(
                                                            new byte[3]))
                                            .build(),
                                    HttpResponse.BodyHandlers.discarding())
                            .statusCode();
            assertEquals(200, accepted);
            int overwrite =
                    client.send(
                                    HttpRequest.newBuilder(URI.create(url))
                                            .header("Content-Type", "image/png")
                                            .header("If-None-Match", "*")
                                            .PUT(
                                                    HttpRequest.BodyPublishers.ofByteArray(
                                                            new byte[3]))
                                            .build(),
                                    HttpResponse.BodyHandlers.discarding())
                            .statusCode();
            assertEquals(412, overwrite);
        } finally {
            storage.deleteObject(key);
        }
    }

    @Test
    void expiredUploadSignatureCannotCreateAnObject() throws Exception {
        String key = "stabilization/expired-" + UUID.randomUUID();
        try {
            String url =
                    storage.createSignedUploadUrl(
                            key, "image/png", 3, java.time.Duration.ofSeconds(1));
            Thread.sleep(2100);
            int status =
                    HttpClient.newHttpClient()
                            .send(
                                    HttpRequest.newBuilder(URI.create(url))
                                            .header("Content-Type", "image/png")
                                            .header("If-None-Match", "*")
                                            .PUT(
                                                    HttpRequest.BodyPublishers.ofByteArray(
                                                            new byte[3]))
                                            .build(),
                                    HttpResponse.BodyHandlers.discarding())
                            .statusCode();
            assertTrue(status >= 400 && status < 500);
            assertFalse(storage.objectExists(key));
        } finally {
            storage.deleteObject(key);
        }
    }

    @Test
    void signedUploadDownloadMetadataAndDeletionUseRealObjectStorage() throws Exception {
        String uploadUrl = storage.createSignedUploadUrl(OBJECT_KEY, "text/plain");
        HttpClient client = HttpClient.newHttpClient();
        HttpResponse<Void> upload =
                client.send(
                        HttpRequest.newBuilder(URI.create(uploadUrl))
                                .header("Content-Type", "text/plain")
                                .header("If-None-Match", "*")
                                .PUT(HttpRequest.BodyPublishers.ofByteArray(CONTENT))
                                .build(),
                        HttpResponse.BodyHandlers.discarding());

        assertEquals(200, upload.statusCode());
        assertTrue(storage.objectExists(OBJECT_KEY));
        assertEquals(CONTENT.length, storage.metadata(OBJECT_KEY).size());
        assertEquals("text/plain", storage.metadata(OBJECT_KEY).contentType());

        HttpResponse<Void> repeat =
                client.send(
                        HttpRequest.newBuilder(URI.create(uploadUrl))
                                .header("Content-Type", "text/plain")
                                .header("If-None-Match", "*")
                                .PUT(
                                        HttpRequest.BodyPublishers.ofString(
                                                "Must not overwrite handover evidence"))
                                .build(),
                        HttpResponse.BodyHandlers.discarding());
        assertEquals(412, repeat.statusCode());
        HttpResponse<Void> unsignedCondition =
                client.send(
                        HttpRequest.newBuilder(URI.create(uploadUrl))
                                .header("Content-Type", "text/plain")
                                .PUT(
                                        HttpRequest.BodyPublishers.ofString(
                                                "Missing signed condition"))
                                .build(),
                        HttpResponse.BodyHandlers.discarding());
        assertTrue(unsignedCondition.statusCode() >= 400 && unsignedCondition.statusCode() < 500);

        HttpResponse<byte[]> download =
                client.send(
                        HttpRequest.newBuilder(
                                        URI.create(storage.createSignedDownloadUrl(OBJECT_KEY)))
                                .GET()
                                .build(),
                        HttpResponse.BodyHandlers.ofByteArray());
        assertEquals(200, download.statusCode());
        assertEquals(
                new String(CONTENT, StandardCharsets.UTF_8),
                new String(download.body(), StandardCharsets.UTF_8));

        storage.deleteObject(OBJECT_KEY);
        assertFalse(storage.objectExists(OBJECT_KEY));
    }
}
