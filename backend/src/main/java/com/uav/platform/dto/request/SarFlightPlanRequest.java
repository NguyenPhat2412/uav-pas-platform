package com.uav.platform.dto.request;

public record SarFlightPlanRequest(
        Long missionId,
        double lkpLat,
        double lkpLng,
        Double sweepWidthMeters,
        Integer maxLegs,
        Double cruiseSpeedMs) {}
