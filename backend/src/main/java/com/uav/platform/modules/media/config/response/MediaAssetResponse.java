package com.uav.platform.modules.media.config.response;

import com.uav.platform.modules.media.common.*;

import com.uav.platform.modules.media.common.MediaType;

import java.time.LocalDateTime;

public record MediaAssetResponse(Long id, String originalName, String objectKey, String contentType, long size,
                                 MediaType type, String linkedEntityType, String linkedEntityId, String uploadedBy,
                                 String storageProvider, boolean confirmed, LocalDateTime confirmedAt, LocalDateTime createdAt) { }
