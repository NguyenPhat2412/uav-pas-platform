package com.uav.platform.modules.sar.config.response;

public record WaypointResponse(
    int index,
    double lat,
    double lng,
    double legDistanceMeters,
    double bearingDeg,
    String label
) {}
