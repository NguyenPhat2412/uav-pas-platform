package com.uav.platform.dto.request.sar;

import java.util.List;

public record TelemetryEvaluateRequest(
        Long missionId,
        String uavCode,
        double currentLat,
        double currentLng,
        double homeLat,
        double homeLng,
        double batteryPct,
        double cruiseSpeedMs,
        Double dischargeRatePctPerMin,
        Double safetyReservePct,
        List<List<Double>> geofencePolygon) {}
