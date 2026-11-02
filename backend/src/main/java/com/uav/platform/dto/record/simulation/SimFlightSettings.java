package com.uav.platform.dto.record.simulation;

/** Flight and link parameters chosen when a simulated flight starts. */
public record SimFlightSettings(
        double altitudeMeters,
        double cruiseSpeedMs,
        double packetLossPct,
        int latencyMs,
        int jitterMs,
        double geofenceRadiusMeters) {}
