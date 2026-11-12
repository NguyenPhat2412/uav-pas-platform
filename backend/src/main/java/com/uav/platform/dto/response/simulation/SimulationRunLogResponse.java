package com.uav.platform.dto.response.simulation;

import com.uav.platform.enums.simulation.SimRunStatus;

import java.time.LocalDateTime;

/** Persisted audit record of a completed, aborted, or running UAV digital flight rehearsal. */
public record SimulationRunLogResponse(
        Long id,
        Long uavId,
        String uavCode,
        Long missionId,
        String missionCode,
        String startedBy,
        SimRunStatus status,
        double altitudeMeters,
        double cruiseSpeedMs,
        double windSpeedMs,
        double windDirectionDeg,
        double timeScale,
        double packetLossPct,
        int latencyMs,
        double startBatteryPct,
        Double endBatteryPct,
        int waypointCount,
        int waypointsReached,
        double distanceFlownMeters,
        double elapsedSeconds,
        long samplesSent,
        long samplesDelivered,
        long samplesLost,
        int airspaceBreaches,
        boolean gpsDegraded,
        String outcomeSummary,
        LocalDateTime startedAt,
        LocalDateTime endedAt) {}
