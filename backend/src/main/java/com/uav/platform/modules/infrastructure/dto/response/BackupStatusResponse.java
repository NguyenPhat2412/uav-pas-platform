package com.uav.platform.modules.infrastructure.dto.response;

import java.time.Instant;
import java.util.List;

/**
 * Local pg_dump backups seen through the read-only backup mount. status is OK, STALE, MISSING or NOT_CONFIGURED.
 * Whether the off-site copy reached R2 is not visible to the app; offsiteTarget only names where to check.
 */
public record BackupStatusResponse(
        String status,
        Instant lastSuccessAt,
        Long hoursSinceLastSuccess,
        long staleAfterHours,
        int fileCount,
        long totalBytes,
        List<BackupFile> files,
        String offsiteTarget,
        Instant checkedAt) {

    public record BackupFile(String name, long sizeBytes, Instant modifiedAt) {}
}
