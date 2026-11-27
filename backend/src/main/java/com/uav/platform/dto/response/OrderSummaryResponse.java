package com.uav.platform.dto.response;

public record OrderSummaryResponse(
        long pending, long scheduled, long inFlight, long delivered, long toReview) {}
