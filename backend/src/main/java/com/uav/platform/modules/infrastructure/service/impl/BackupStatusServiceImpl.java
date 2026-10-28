package com.uav.platform.modules.infrastructure.service.impl;

import com.uav.platform.modules.infrastructure.dto.response.BackupStatusResponse;
import com.uav.platform.modules.infrastructure.dto.response.BackupStatusResponse.BackupFile;
import com.uav.platform.modules.infrastructure.service.BackupStatusService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Reads the daily pg_dump folder (deploy/DEPLOY.md section 9) through a read-only mount. Only regular files directly
 * inside app.backup.dir are considered; symlinks and anything resolving outside the folder are ignored.
 */
@Service
public class BackupStatusServiceImpl implements BackupStatusService {
    static final String LAST_SUCCESS = "LAST_SUCCESS";
    static final String OFFSITE_TARGET = "R2 bucket uavpas-backups/db/";
    static final int MAX_FILES = 60;
    private static final Pattern BACKUP_NAME = Pattern.compile("[A-Za-z0-9._-]{1,120}\\.sql\\.gz");

    private final String directory;
    private final long staleAfterHours;
    private final Clock clock;

    @Autowired
    public BackupStatusServiceImpl(
            @Value("${app.backup.dir:}") String directory,
            @Value("${app.backup.stale-after-hours:36}") long staleAfterHours) {
        this(directory, staleAfterHours, Clock.systemUTC());
    }

    BackupStatusServiceImpl(String directory, long staleAfterHours, Clock clock) {
        this.directory = directory == null ? "" : directory.trim();
        this.staleAfterHours = staleAfterHours;
        this.clock = clock;
    }

    @Override
    public BackupStatusResponse status() {
        Instant now = clock.instant();
        if (directory.isEmpty())
            return new BackupStatusResponse(
                    "NOT_CONFIGURED",
                    null,
                    null,
                    staleAfterHours,
                    0,
                    0,
                    List.of(),
                    OFFSITE_TARGET,
                    now);
        Path root;
        try {
            root = Path.of(directory).toRealPath();
        } catch (IOException | RuntimeException missing) {
            return empty("MISSING", now);
        }
        if (!Files.isDirectory(root) || !Files.isReadable(root)) return empty("MISSING", now);

        List<BackupFile> files = listBackups(root);
        Instant lastSuccess = readLastSuccess(root).orElse(null);
        // Without the marker, the newest dump is the best evidence that a run finished.
        Instant evidence =
                lastSuccess != null
                        ? lastSuccess
                        : files.stream()
                                .map(BackupFile::modifiedAt)
                                .max(Comparator.naturalOrder())
                                .orElse(null);
        String status = classify(evidence, files.size(), now, staleAfterHours);
        Long hours = evidence == null ? null : Duration.between(evidence, now).toHours();
        long total = files.stream().mapToLong(BackupFile::sizeBytes).sum();
        return new BackupStatusResponse(
                status,
                lastSuccess,
                hours,
                staleAfterHours,
                files.size(),
                total,
                files.stream().limit(MAX_FILES).toList(),
                OFFSITE_TARGET,
                now);
    }

    /** MISSING when nothing proves a backup ever ran, STALE when the last proof is older than the threshold. */
    static String classify(Instant lastEvidence, int fileCount, Instant now, long staleAfterHours) {
        if (lastEvidence == null || fileCount == 0) return "MISSING";
        return Duration.between(lastEvidence, now).compareTo(Duration.ofHours(staleAfterHours)) > 0
                ? "STALE"
                : "OK";
    }

    private BackupStatusResponse empty(String status, Instant now) {
        return new BackupStatusResponse(
                status, null, null, staleAfterHours, 0, 0, List.of(), OFFSITE_TARGET, now);
    }

    static List<BackupFile> listBackups(Path root) {
        List<BackupFile> files = new ArrayList<>();
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(root, "*.sql.gz")) {
            for (Path entry : stream) {
                String name = entry.getFileName().toString();
                if (!BACKUP_NAME.matcher(name).matches()) continue;
                Optional<Path> inside = resolveInside(root, name);
                if (inside.isEmpty()) continue;
                BasicFileAttributes attributes =
                        Files.readAttributes(
                                inside.get(), BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
                if (!attributes.isRegularFile()) continue;
                files.add(
                        new BackupFile(
                                name,
                                attributes.size(),
                                attributes.lastModifiedTime().toInstant()));
            }
        } catch (IOException unreadable) {
            return List.of();
        }
        files.sort(Comparator.comparing(BackupFile::modifiedAt).reversed());
        return files;
    }

    /**
     * Resolves a plain file name directly inside root. Separators, "..", absolute paths and symlinks are rejected,
     * so nothing outside the backup folder can be read through this service.
     */
    static Optional<Path> resolveInside(Path root, String name) {
        if (name == null
                || name.isBlank()
                || name.contains("/")
                || name.contains("\\")
                || name.contains("\0")
                || name.equals(".")
                || name.equals("..")) return Optional.empty();
        Path candidate = root.resolve(name).normalize();
        if (!candidate.getParent().equals(root)) return Optional.empty();
        if (Files.isSymbolicLink(candidate)) return Optional.empty();
        if (!Files.isRegularFile(candidate, LinkOption.NOFOLLOW_LINKS)) return Optional.empty();
        return Optional.of(candidate);
    }

    static Optional<Instant> readLastSuccess(Path root) {
        Optional<Path> marker = resolveInside(root, LAST_SUCCESS);
        if (marker.isEmpty()) return Optional.empty();
        try (InputStream in = Files.newInputStream(marker.get(), LinkOption.NOFOLLOW_LINKS)) {
            return parseTimestamp(new String(in.readNBytes(100), StandardCharsets.UTF_8));
        } catch (IOException unreadable) {
            return Optional.empty();
        }
    }

    /** Accepts `date -Is` output (2026-10-25T03:00:01+07:00) or a plain ISO instant. */
    static Optional<Instant> parseTimestamp(String raw) {
        if (raw == null) return Optional.empty();
        String value = raw.strip();
        if (value.isEmpty()) return Optional.empty();
        // Older GNU date prints +0700 without the colon.
        if (value.matches(".*[+-]\\d{4}$"))
            value =
                    value.substring(0, value.length() - 2)
                            + ":"
                            + value.substring(value.length() - 2);
        try {
            return Optional.of(OffsetDateTime.parse(value).toInstant());
        } catch (DateTimeParseException notOffset) {
            try {
                return Optional.of(Instant.parse(value));
            } catch (DateTimeParseException invalid) {
                return Optional.empty();
            }
        }
    }
}
