package com.uav.platform.modules.media.dto.response;

import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.media.enums.MediaType;

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
