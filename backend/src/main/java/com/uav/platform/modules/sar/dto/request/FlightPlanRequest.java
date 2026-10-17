package com.uav.platform.modules.sar.dto.request;

public record FlightPlanRequest(
        Long missionId,
        double lkpLat,
        double lkpLng,
        Double sweepWidthMeters,
        Integer maxLegs,
        Double cruiseSpeedMs) {}
