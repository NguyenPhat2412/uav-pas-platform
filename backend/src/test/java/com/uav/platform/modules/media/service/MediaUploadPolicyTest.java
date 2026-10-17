package com.uav.platform.modules.media.service;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.error.SystemException;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;

class MediaUploadPolicyTest {
    @Test
    void decimalBoundariesAreInclusiveForEveryAllowedType() {
        for (String mime :
                java.util.List.of(
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                        "application/pdf",
                        "video/mp4",
                        "video/webm")) {
            long max = mime.startsWith("video/") ? 1_000_000_000L : 100_000_000L;
            assertDoesNotThrow(() -> MediaUploadPolicy.validate(mime, max));
            assertDoesNotThrow(() -> MediaUploadPolicy.validate(mime, 1));
            assertThrows(SystemException.class, () -> MediaUploadPolicy.validate(mime, max + 1));
            assertThrows(SystemException.class, () -> MediaUploadPolicy.validate(mime, 0));
            assertThrows(SystemException.class, () -> MediaUploadPolicy.validate(mime, -1));
        }
    }

    @Test
    void headerIdentificationRejectsLiesAndTruncationForEveryAllowedType() {
        Map<String, byte[]> examples =
                Map.of(
                        "image/jpeg", new byte[] {(byte) 255, (byte) 216, (byte) 255, 0},
                        "image/png", new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10},
                        "image/webp", "RIFF0000WEBP".getBytes(StandardCharsets.US_ASCII),
                        "application/pdf", "%PDF-1.7".getBytes(StandardCharsets.US_ASCII),
                        "video/mp4",
                                new byte[] {0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109},
                        "video/webm",
                                new byte[] {26, 69, (byte) 223, (byte) 163, 0, 119, 101, 98, 109});
        examples.forEach(
                (mime, bytes) -> {
                    assertDoesNotThrow(() -> MediaUploadPolicy.validateHeader(mime, bytes));
                    assertThrows(
                            SystemException.class,
                            () ->
                                    MediaUploadPolicy.validateHeader(
                                            mime,
                                            "untrusted text".getBytes(StandardCharsets.US_ASCII)));
                    assertThrows(
                            SystemException.class,
                            () -> MediaUploadPolicy.validateHeader(mime, new byte[1]));
                });
    }

    @Test
    void exactly24HoursExpiresWithoutWaitingForWallClock() {
        var created = LocalDateTime.of(2026, 10, 17, 0, 0);
        assertFalse(MediaUploadPolicy.expired(created, created.plusHours(24).minusNanos(1)));
        assertTrue(MediaUploadPolicy.expired(created, created.plusHours(24)));
    }
}
