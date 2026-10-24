package com.uav.platform.modules.mission.dto.response;

import java.util.List;

/** Stored flight plan with server-computed geometry (square metres, metres, decimal degrees). */
public record FlightPlanResponse(
        String areaType,
        List<List<Double>> vertices,
        Integer radiusMeters,
        Double takeoffLatitude,
        Double takeoffLongitude,
        Double centerLatitude,
        Double centerLongitude,
        Double areaSquareMeters,
        Double perimeterMeters,
        Integer altitudeAglMeters,
        Double targetGsdCm,
        Integer forwardOverlap,
        Integer sideOverlap,
        List<String> sensors,
        String obstacles,
        boolean permitSupport) {}
