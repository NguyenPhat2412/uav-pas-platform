package com.uav.platform.modules.billing.service.impl;

import java.time.Duration;
import java.time.LocalDateTime;

/** Planned flight hours of a mission window: one decimal, at least half an hour. */
public final class FlightHoursOperations {
    private FlightHoursOperations() {}

    public static double plannedHours(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null || !end.isAfter(start)) return 1.0;
        long minutes = Duration.between(start, end).toMinutes();
        // No upper cap: mission validation rejects windows longer than 24 h, so billing and quota
        // always see the real duration instead of a silently truncated one.
        return Math.max(0.5, Math.round((minutes / 60.0) * 10.0) / 10.0);
    }
}
