package com.uav.platform.dto.response.mission;

import java.time.LocalDateTime;

public record MissionReviewResponse(
        boolean reviewed,
        Long id,
        Long missionId,
        String missionCode,
        Long customerId,
        String customerUsername,
        String customerFullName,
        Integer overallRating,
        Integer dataQualityRating,
        Integer timelinessRating,
        boolean deliverablesAccepted,
        String comment,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
