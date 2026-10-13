package com.uav.platform.modules.sar.config.request;

public record FlightPlanRequest(
    Long missionId,
    double lkpLat,
    double lkpLng,
    Double sweepWidthMeters,
    Integer maxLegs,
    Double cruiseSpeedMs
) {}
