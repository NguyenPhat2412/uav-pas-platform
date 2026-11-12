package com.uav.platform.dto.response.infrastructure;

import java.time.Instant;

/**
 * Media bucket usage and the media table's lifecycle counts. Endpoint, bucket name and keys are never included.
 * reachable is UP, DOWN or UNKNOWN; usage fields are null when listing failed or is unsupported.
 */
public record StorageStatusResponse(
        String provider,
        String reachable,
        Long objectCount,
        Long totalBytes,
        Boolean usageTruncated,
        Instant usageCheckedAt,
        String usageError,
        MediaStats media) {

    public record MediaStats(
            long confirmed,
            long confirmedBytes,
            long awaitingUpload,
            long expiredUploads,
            long pendingCleanup,
            long cleanupOverdue,
            long cleanupRetrying,
            long purged) {}
}
