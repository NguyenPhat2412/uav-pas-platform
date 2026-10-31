package com.uav.platform.dto.response.mission;

import java.time.LocalDateTime;
import java.util.List;

public record MissionDispatchResourcesResponse(
        MissionResponse mission,
        long version,
        Long stationId,
        Long operatorId,
        List<Reservation> reservations) {
    public record Reservation(
            Long id,
            Long equipmentId,
            String equipmentName,
            Long stationId,
            int quantity,
            boolean released,
            LocalDateTime releasedAt) {}
}
