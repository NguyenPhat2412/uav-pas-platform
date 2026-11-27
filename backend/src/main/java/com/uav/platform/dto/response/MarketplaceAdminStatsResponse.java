package com.uav.platform.dto.response;

import java.math.BigDecimal;

public record MarketplaceAdminStatsResponse(
        long totalOrders,
        long pendingDispatchCount,
        long pendingProviderCount,
        long scheduledCount,
        long inFlightCount,
        long deliveredCount,
        long reviewedCount,
        long cancelledCount,
        long activeProvidersCount,
        long pendingProvidersCount,
        long publishedListingsCount,
        long pendingListingsCount,
        BigDecimal illustrativeGrossRevenueVnd,
        BigDecimal illustrativePlatformFeeVnd,
        String illustrativeNote) {}
