package com.uav.platform.dto.response.marketplace.admin;

import java.math.BigDecimal;

public record DispatchCandidateProviderResponse(
        Long providerId,
        String displayName,
        String province,
        double distanceKm,
        int availableUavCount,
        BigDecimal ratingAvg,
        int completedMissionsCount,
        double score) {}
