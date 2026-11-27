package com.uav.platform.dto.response;

import com.uav.platform.enums.*;
import com.uav.platform.enums.MediaType;

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
        MediaVisibility visibility,
        String storageProvider,
        boolean confirmed,
        LocalDateTime confirmedAt,
        LocalDateTime createdAt) {}
