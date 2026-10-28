package com.uav.platform.modules.infrastructure.service.impl;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.modules.infrastructure.dto.response.BackupStatusResponse;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

class BackupStatusServiceImplTest {
    private static final Instant NOW = Instant.parse("2026-10-25T03:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @TempDir Path dir;

    private BackupStatusResponse status(String directory) {
        return new BackupStatusServiceImpl(directory, 36, CLOCK).status();
    }

    private Path dump(String name, Instant modified) throws Exception {
        Path file = Files.write(dir.resolve(name), new byte[] {1, 2, 3});
        Files.setLastModifiedTime(file, FileTime.from(modified));
        return file;
    }

    @Test
    void blankDirectoryIsNotConfigured() {
        assertEquals("NOT_CONFIGURED", status("").status());
        assertEquals("NOT_CONFIGURED", status("  ").status());
    }

    @Test
    void absentOrEmptyDirectoryIsMissing() {
        assertEquals("MISSING", status(dir.resolve("nope").toString()).status());
        assertEquals("MISSING", status(dir.toString()).status());
    }

    @Test
    void freshMarkerAndDumpIsOk() throws Exception {
        dump("uav_pas-2026-10-25.sql.gz", NOW.minus(Duration.ofHours(2)));
        Files.writeString(dir.resolve("LAST_SUCCESS"), "2026-10-25T09:00:00+07:00\n");
        BackupStatusResponse response = status(dir.toString());
        assertEquals("OK", response.status());
        assertEquals(Instant.parse("2026-10-25T02:00:00Z"), response.lastSuccessAt());
        assertEquals(1L, response.hoursSinceLastSuccess());
        assertEquals(1, response.fileCount());
        assertEquals(3, response.totalBytes());
        assertEquals("uav_pas-2026-10-25.sql.gz", response.files().get(0).name());
    }

    @Test
    void markerOlderThanThresholdIsStale() throws Exception {
        dump("uav_pas-2026-10-23.sql.gz", NOW.minus(Duration.ofHours(40)));
        Files.writeString(dir.resolve("LAST_SUCCESS"), "2026-10-23T11:00:00+00:00");
        assertEquals("STALE", status(dir.toString()).status());
    }

    @Test
    void withoutMarkerNewestDumpDecides() throws Exception {
        dump("uav_pas-2026-10-20.sql.gz", NOW.minus(Duration.ofDays(5)));
        assertEquals("STALE", status(dir.toString()).status());
        dump("uav_pas-2026-10-24.sql.gz", NOW.minus(Duration.ofHours(20)));
        BackupStatusResponse response = status(dir.toString());
        assertEquals("OK", response.status());
        assertNull(response.lastSuccessAt());
        assertEquals("uav_pas-2026-10-24.sql.gz", response.files().get(0).name());
    }

    @Test
    void markerWithoutAnyDumpIsMissing() throws Exception {
        Files.writeString(dir.resolve("LAST_SUCCESS"), "2026-10-25T02:00:00Z");
        assertEquals("MISSING", status(dir.toString()).status());
    }

    @Test
    void thresholdBoundary() {
        assertEquals(
                "OK",
                BackupStatusServiceImpl.classify(NOW.minus(Duration.ofHours(36)), 1, NOW, 36));
        assertEquals(
                "STALE",
                BackupStatusServiceImpl.classify(
                        NOW.minus(Duration.ofHours(36)).minusSeconds(1), 1, NOW, 36));
        assertEquals("MISSING", BackupStatusServiceImpl.classify(null, 3, NOW, 36));
    }

    @Test
    void onlyPlainDumpFilesInsideTheFolderAreListed() throws Exception {
        dump("uav_pas-2026-10-25.sql.gz", NOW.minusSeconds(60));
        Files.writeString(dir.resolve("notes.txt"), "x");
        Files.writeString(dir.resolve("uav_pas-2026-10-25.sql.gz.tmp"), "partial");
        Files.createDirectory(dir.resolve("nested.sql.gz"));
        Path outside = Files.createTempFile("outside", ".sql.gz");
        try {
            Files.createSymbolicLink(dir.resolve("linked.sql.gz"), outside);
            BackupStatusResponse response = status(dir.toString());
            assertEquals(1, response.fileCount());
            assertEquals("uav_pas-2026-10-25.sql.gz", response.files().get(0).name());
        } finally {
            Files.deleteIfExists(outside);
        }
    }

    @Test
    void traversalNamesAreRejected() throws Exception {
        Path root = dir.toRealPath();
        Files.writeString(root.resolve("LAST_SUCCESS"), "2026-10-25T02:00:00Z");
        Files.createDirectory(root.resolve("sub"));
        Files.writeString(root.resolve("sub/inner.sql.gz"), "x");
        for (String name :
                new String[] {
                    "../LAST_SUCCESS",
                    "..",
                    ".",
                    "/etc/passwd",
                    "sub/inner.sql.gz",
                    "a\\b",
                    "",
                    null
                }) {
            assertTrue(
                    BackupStatusServiceImpl.resolveInside(root, name).isEmpty(),
                    String.valueOf(name));
        }
        assertTrue(BackupStatusServiceImpl.resolveInside(root, "LAST_SUCCESS").isPresent());
    }

    @Test
    void symlinkedMarkerIsIgnored() throws Exception {
        Path outside = Files.createTempFile("marker", ".txt");
        try {
            Files.writeString(outside, "2026-10-25T02:00:00Z");
            Files.createSymbolicLink(dir.resolve("LAST_SUCCESS"), outside);
            assertTrue(BackupStatusServiceImpl.readLastSuccess(dir.toRealPath()).isEmpty());
        } finally {
            Files.deleteIfExists(outside);
        }
    }

    @Test
    void parsesDateIsFormats() {
        assertEquals(
                Instant.parse("2026-10-25T02:00:01Z"),
                BackupStatusServiceImpl.parseTimestamp("2026-10-25T09:00:01+07:00\n")
                        .orElseThrow());
        assertEquals(
                Instant.parse("2026-10-25T02:00:01Z"),
                BackupStatusServiceImpl.parseTimestamp("2026-10-25T09:00:01+0700").orElseThrow());
        assertTrue(BackupStatusServiceImpl.parseTimestamp("garbage").isEmpty());
        assertTrue(BackupStatusServiceImpl.parseTimestamp("").isEmpty());
    }
}
