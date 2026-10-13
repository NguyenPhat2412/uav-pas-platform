package com.uav.platform.modules.sar.config.request;

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
    List<List<Double>> geofencePolygon
) {}
