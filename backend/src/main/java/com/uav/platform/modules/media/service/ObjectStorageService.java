package com.uav.platform.modules.media.service;


import com.uav.platform.modules.media.common.*;

public interface ObjectStorageService {
    String provider();
    String createSignedUploadUrl(String objectKey, String contentType);
    String createSignedDownloadUrl(String objectKey);
    boolean objectExists(String objectKey);
    ObjectMetadata metadata(String objectKey);
    record ObjectMetadata(long size, String contentType) {}
    void deleteObject(String objectKey);
}
