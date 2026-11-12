package com.uav.platform.dto.request.simulation;

import jakarta.validation.constraints.*;

import java.util.List;

/**
 * Starts a simulated flight for a UAV. Waypoints are [latitude, longitude]; when none are given and
 * the mission has a polygon or circle flight plan, a route is generated from it. Home defaults to the
 * flight plan's take-off point, then the UAV's station, then the first waypoint.
 */
public record SimulationStartRequest(
        @NotNull Long uavId,
        Long missionId,
        @Size(max = 500) List<@Size(min = 2, max = 2) List<@NotNull Double>> waypoints,
        @DecimalMin("-90") @DecimalMax("90") Double homeLatitude,
        @DecimalMin("-180") @DecimalMax("180") Double homeLongitude,
        @DecimalMin("10") @DecimalMax("120") Double altitudeMeters,
        @DecimalMin("2") @DecimalMax("20") Double cruiseSpeedMs,
        @DecimalMin("0") @DecimalMax("60") Double packetLossPct,
        @Min(0) @Max(5000) Integer latencyMs,
        @Min(0) @Max(2000) Integer jitterMs,
        @Min(25) @Max(100) Integer batteryPct,
        @DecimalMin("100") @DecimalMax("20000") Double geofenceRadiusMeters,
        @DecimalMin("0") @DecimalMax("25") Double windSpeedMs,
        @DecimalMin("0") @DecimalMax("360") Double windDirectionDeg,
        @DecimalMin("1") @DecimalMax("5") Double timeScale) {

    public SimulationStartRequest(
            Long uavId,
            Long missionId,
            List<List<Double>> waypoints,
            Double homeLatitude,
            Double homeLongitude,
            Double altitudeMeters,
            Double cruiseSpeedMs,
            Double packetLossPct,
            Integer latencyMs,
            Integer jitterMs,
            Integer batteryPct,
            Double geofenceRadiusMeters) {
        this(
                uavId,
                missionId,
                waypoints,
                homeLatitude,
                homeLongitude,
                altitudeMeters,
                cruiseSpeedMs,
                packetLossPct,
                latencyMs,
                jitterMs,
                batteryPct,
                geofenceRadiusMeters,
                null,
                null,
                null);
    }
}
