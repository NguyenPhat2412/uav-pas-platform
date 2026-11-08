package com.uav.platform.dto.record.simulation;

/** Flight, environment, and link parameters chosen when a simulated flight starts. */
public record SimFlightSettings(
        double altitudeMeters,
        double cruiseSpeedMs,
        double packetLossPct,
        int latencyMs,
        int jitterMs,
        double geofenceRadiusMeters,
        double windSpeedMs,
        double windDirectionDeg,
        double timeScale) {

    public SimFlightSettings(
            double altitudeMeters,
            double cruiseSpeedMs,
            double packetLossPct,
            int latencyMs,
            int jitterMs,
            double geofenceRadiusMeters) {
        this(
                altitudeMeters,
                cruiseSpeedMs,
                packetLossPct,
                latencyMs,
                jitterMs,
                geofenceRadiusMeters,
                0,
                0,
                1.0);
    }
}
