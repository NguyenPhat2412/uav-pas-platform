package com.uav.platform.dto.response.uav;

import java.time.LocalDateTime;

/** Latest sample; ageSeconds is measured from recordedAt and stale is true past the freshness window (120 s). */
public record TelemetryResponse(
        Long uavId,
        Long missionId,
        LocalDateTime recordedAt,
        double latitude,
        double longitude,
        Double altitudeAglMeters,
        Double groundSpeedMs,
        Double headingDeg,
        Integer batteryPct,
        String rtkStatus,
        Integer satellites,
        long ageSeconds,
        boolean stale) {}
