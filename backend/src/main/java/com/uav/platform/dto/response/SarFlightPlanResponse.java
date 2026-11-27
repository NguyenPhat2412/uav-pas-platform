package com.uav.platform.dto.response;

import java.util.List;

public record SarFlightPlanResponse(
        Long missionId,
        String patternType,
        double lkpLat,
        double lkpLng,
        double sweepWidthMeters,
        double totalDistanceMeters,
        double estimatedFlightMinutes,
        List<WaypointResponse> waypoints) {}
