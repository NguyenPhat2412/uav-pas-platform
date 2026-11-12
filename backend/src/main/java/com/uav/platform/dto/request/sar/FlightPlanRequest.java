package com.uav.platform.dto.request.sar;

public record FlightPlanRequest(
        Long missionId,
        double lkpLat,
        double lkpLng,
        Double sweepWidthMeters,
        Integer maxLegs,
        Double cruiseSpeedMs) {}
