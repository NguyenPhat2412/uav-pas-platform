package com.uav.platform.dto.response.sar;

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
