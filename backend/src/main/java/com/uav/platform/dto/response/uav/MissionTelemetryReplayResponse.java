package com.uav.platform.dto.response.uav;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Full 3D flight trajectory, attitude HUD (pitch/roll/yaw/gimbal) and terrain elevation profile
 * for mission replay and pre-flight terrain verification.
 */
public record MissionTelemetryReplayResponse(
        Long missionId,
        String missionCode,
        Long uavId,
        String uavSerialNumber,
        String uavModel,
        String airframeClass,
        double totalDistanceMeters,
        double maxAltitudeMeters,
        double minClearanceMeters,
        boolean terrainClearanceSafe,
        List<ReplaySample> samples) {

    public record ReplaySample(
            int index,
            LocalDateTime recordedAt,
            double latitude,
            double longitude,
            double altitudeAglMeters,
            double terrainElevationMeters,
            double clearanceMeters,
            double groundSpeedMs,
            double headingDeg,
            double pitchDeg,
            double rollDeg,
            double gimbalPitchDeg,
            int batteryPct,
            String rtkStatus,
            int satellites,
            double distanceFromStartMeters,
            String source) {}
}
