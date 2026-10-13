package com.uav.platform.modules.sar.config.response;

import java.time.LocalDateTime;

public record AiDetectionResponse(
    Long id,
    Long aiTaskId,
    Long missionId,
    String label,
    Double confidence,
    Double boxTop,
    Double boxLeft,
    Double boxWidth,
    Double boxHeight,
    Double latitude,
    Double longitude,
    String trackingId,
    Boolean verified,
    String verifiedBy,
    LocalDateTime createdAt
) {}
