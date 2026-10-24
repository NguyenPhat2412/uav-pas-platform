package com.uav.platform.modules.media.service;

import com.uav.platform.modules.media.dto.record.ObjectMetadata;
import com.uav.platform.modules.media.enums.*;

public interface ObjectStorageService {
    String provider();

    String createSignedUploadUrl(String objectKey, String contentType);

    String createSignedUploadUrl(
            String objectKey, String contentType, long size, java.time.Duration validity);

    byte[] readHeader(String objectKey);

    String createSignedDownloadUrl(String objectKey);

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
}
