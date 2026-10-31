package com.uav.platform.dto.response.media;

import com.uav.platform.enums.media.*;
import com.uav.platform.enums.media.MediaType;

import java.time.LocalDateTime;

public record MediaAssetResponse(
        Long id,
        String originalName,
        String objectKey,
        String contentType,
        long size,
        MediaType type,
        String linkedEntityType,
        String linkedEntityId,
        String uploadedBy,
        String storageProvider,
        boolean confirmed,
        LocalDateTime confirmedAt,
        LocalDateTime createdAt) {}
