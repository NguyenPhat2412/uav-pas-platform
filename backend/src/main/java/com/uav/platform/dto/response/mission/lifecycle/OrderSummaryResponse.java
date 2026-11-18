package com.uav.platform.dto.response.mission.lifecycle;

public record OrderSummaryResponse(
        long pending, long scheduled, long inFlight, long delivered, long toReview) {}
