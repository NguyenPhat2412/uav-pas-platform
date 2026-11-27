package com.uav.platform.dto.response;

import java.time.LocalDateTime;

public record MarketplaceReviewResponse(
        Long id,
        Long missionId,
        String missionTitle,
        String customerName,
        Integer overallRating,
        Integer dataQualityRating,
        Integer timelinessRating,
        boolean deliverablesAccepted,
        String comment,
        LocalDateTime updatedAt) {}
