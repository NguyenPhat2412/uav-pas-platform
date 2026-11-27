package com.uav.platform.dto.response;

import com.uav.platform.enums.MissionBidStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MissionBidResponse(
        Long id,
        Long missionId,
        String missionCode,
        String missionTitle,
        Long providerId,
        String providerSlug,
        String providerDisplayName,
        BigDecimal providerRatingAvg,
        int providerCompletedMissionsCount,
        BigDecimal proposedPriceVnd,
        Integer estimatedDeliveryHours,
        String proposalNote,
        String proposedUavModel,
        MissionBidStatus status,
        LocalDateTime respondedAt,
        LocalDateTime createdAt) {}
