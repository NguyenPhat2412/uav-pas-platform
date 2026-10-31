package com.uav.platform.service.media;

import com.uav.platform.dto.record.media.ObjectMetadata;
import com.uav.platform.enums.media.*;

public interface ObjectStorageService {
    String provider();

    String createSignedUploadUrl(String objectKey, String contentType);

    String createSignedUploadUrl(
            String objectKey, String contentType, long size, java.time.Duration validity);

    byte[] readHeader(String objectKey);

    String createSignedDownloadUrl(String objectKey);

    /** Signed GET valid for {@code validity}; implementations without a custom lifetime use their default. */
    default String createSignedDownloadUrl(String objectKey, java.time.Duration validity) {
        return createSignedDownloadUrl(objectKey);
    }

    boolean objectExists(String objectKey);

    ObjectMetadata metadata(String objectKey);

    void deleteObject(String objectKey);

    /**
     * Whether the configured bucket answers right now; used by the admin health page. Implementations that cannot
     * check cheaply keep this default, which the health page reports as UNKNOWN.
     */
    default boolean bucketReachable() {
        throw new UnsupportedOperationException("Storage health check not supported");
    }

    /**
     * Counts objects and bytes in the configured bucket, reading at most maxObjects keys. Read only; used by the
     * admin infrastructure page. Implementations that cannot list keep this default (reported as UNKNOWN).
     */
    default com.uav.platform.dto.record.media.StorageUsage usage(long maxObjects) {
        throw new UnsupportedOperationException("Storage usage listing not supported");
    }
}
