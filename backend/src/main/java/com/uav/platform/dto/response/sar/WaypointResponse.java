package com.uav.platform.dto.response.sar;

public record WaypointResponse(
        int index,
        double lat,
        double lng,
        double legDistanceMeters,
        double bearingDeg,
        String label) {}
