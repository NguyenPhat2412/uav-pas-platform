package com.uav.platform.modules.media.service.impl;

import com.uav.platform.modules.media.entity.*;
import com.uav.platform.modules.media.enums.*;

import java.time.LocalDateTime;

/** Internal service implementation rules; persistence entities contain data only. */
public final class MediaAssetOperations {
    private MediaAssetOperations() {}

    public static void recordUploadUntil(MediaAsset value, LocalDateTime until) {
        if (value.getUploadValidUntil() == null || until.isAfter(value.getUploadValidUntil()))
            value.setUploadValidUntil(until);
    }

    public static void queueDeletion(MediaAsset value, LocalDateTime now) {
        value.setDeleted(true);
        // Delay deletion until issued signed PUTs cannot recreate the object.
        if (value.getDeleteAfter() == null)
            value.setDeleteAfter(
                    value.getUploadValidUntil() != null && value.getUploadValidUntil().isAfter(now)
                            ? value.getUploadValidUntil()
                            : now);
    }

    public static void deletionSucceeded(MediaAsset value, LocalDateTime now) {
        value.setObjectDeletedAt(now);
        // S3 validates expiry when a PUT starts. A previously admitted stream may finish later.
        // Retain a low-frequency tombstone sweep so late completion cannot leak a deleted file.
        value.setDeleteAfter(now.plusHours(24));
    }

    public static void deletionFailed(MediaAsset value, LocalDateTime now) {
        value.setDeleteAttempts(Math.min(value.getDeleteAttempts() + 1, 30));
        value.setDeleteAfter(
                now.plusSeconds(
                        Math.min(3600L, 30L << Math.min(value.getDeleteAttempts() - 1, 7))));
    }

    public static void markDeleted(MediaAsset value) {
        value.setDeleted(true);
    }

    public static void confirm(MediaAsset value) {
        value.setConfirmed(true);
        value.setConfirmedAt(LocalDateTime.now());
    }
}
