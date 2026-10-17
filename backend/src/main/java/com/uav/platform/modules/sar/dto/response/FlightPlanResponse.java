package com.uav.platform.modules.sar.dto.response;

import java.util.List;

public record FlightPlanResponse(
        Long missionId,
        String patternType,
        double lkpLat,
        double lkpLng,
        double sweepWidthMeters,
        double totalDistanceMeters,
        double estimatedFlightMinutes,
        List<WaypointResponse> waypoints) {}
