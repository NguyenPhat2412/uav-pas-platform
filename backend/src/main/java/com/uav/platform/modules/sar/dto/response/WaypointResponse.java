package com.uav.platform.modules.sar.dto.response;

public record WaypointResponse(
        int index,
        double lat,
        double lng,
        double legDistanceMeters,
        double bearingDeg,
        String label) {}
