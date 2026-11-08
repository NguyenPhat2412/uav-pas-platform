package com.uav.platform.dto.response.simulation;

import com.uav.platform.enums.simulation.SimEventLevel;
import com.uav.platform.enums.simulation.SimFlightMode;

import java.time.LocalDateTime;
import java.util.List;

/** Live state of a simulated flight, including environment settings, safety counters, and link metrics. */
public record SimulationStateResponse(
        Long runLogId,
        Long uavId,
        String uavCode,
        Long missionId,
        String missionCode,
        SimFlightMode mode,
        boolean finished,
        LocalDateTime startedAt,
        double elapsedSeconds,
        double latitude,
        double longitude,
        double altitudeMeters,
        double groundSpeedMs,
        double headingDeg,
        double batteryPct,
        String rtkStatus,
        int satelliteCount,
        int airspaceBreaches,
        boolean gpsDegraded,
        int nextWaypoint,
        int waypointCount,
        double distanceFlownMeters,
        double distanceToHomeMeters,
        List<Double> home,
        List<List<Double>> waypoints,
        List<List<Double>> track,
        Settings settings,
        Link link,
        List<Event> events) {

    public record Settings(
            double altitudeMeters,
            double cruiseSpeedMs,
            double packetLossPct,
            int latencyMs,
            int jitterMs,
            double geofenceRadiusMeters,
            double windSpeedMs,
            double windDirectionDeg,
            double timeScale) {}

    /** sent = samples produced, delivered = ingested by the platform, lost = dropped by the link. */
    public record Link(
            long sent,
            long delivered,
            long lost,
            double lossPct,
            double averageLatencyMs,
            long maxLatencyMs) {}

    public record Event(LocalDateTime at, SimEventLevel level, String message) {}
}
