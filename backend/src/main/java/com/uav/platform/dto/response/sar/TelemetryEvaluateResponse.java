package com.uav.platform.dto.response.sar;

public record TelemetryEvaluateResponse(
        Long missionId,
        String uavCode,
        double distanceToHomeMeters,
        double estimatedReturnTimeSec,
        double requiredBatteryPct,
        double availableBatteryPct,
        boolean mustTriggerRth,
        String rthStatus,
        boolean insideGeofence,
        boolean alertDispatched,
        String recommendation,
        boolean flightCommandSent,
        String deliveryStatus) {}
