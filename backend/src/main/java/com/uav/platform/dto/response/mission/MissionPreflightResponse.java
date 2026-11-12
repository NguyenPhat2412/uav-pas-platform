package com.uav.platform.dto.response.mission;

import java.time.LocalDateTime;

public record MissionPreflightResponse(
        boolean recorded,
        Long id,
        Long missionId,
        String signedByUsername,
        LocalDateTime signedAt,
        boolean airframeAndPropellersSafe,
        boolean batteryHealthy,
        boolean gnssRtkLocked,
        boolean weatherWithinLimits,
        boolean airspaceAndPermitCleared,
        Integer measuredBatteryPct,
        Integer satelliteCount,
        Double measuredWindMs,
        boolean clearedForTakeoff,
        String notes,
        LocalDateTime updatedAt) {}
