package com.uav.platform.dto.response.mission.lifecycle;

import com.uav.platform.enums.mission.MissionStatus;

import java.time.LocalDateTime;
import java.util.List;

public record OrderTrackingResponse(
        Long missionId,
        String missionCode,
        MissionStatus status,
        String statusGroup,
        boolean activeSimulation,
        double progressPct,
        Position position,
        double battery,
        Link link,
        int etaMinutes,
        List<List<Double>> waypoints,
        List<List<Double>> track,
        LocalDateTime updatedAt) {

    public record Position(
            double latitude,
            double longitude,
            double altitudeMeters,
            double headingDeg,
            double speedMs) {}

    public record Link(
            long sent, long delivered, long lost, double lossPct, double averageLatencyMs) {}
}
