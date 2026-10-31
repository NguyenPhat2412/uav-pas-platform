package com.uav.platform.dto.response.dashboard;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Where each UAV is. A fresh telemetry fix wins; otherwise an assigned or flying UAV is placed at its current
 * mission's coordinates and any other UAV at its home station. positionSource says which was used.
 */
public record FleetMapResponse(
        List<UavPin> uavs, List<StationPin> stations, LocalDateTime generatedAt) {

    /** positionSource is TELEMETRY (fresh device fix), MISSION, STATION or NONE (no coordinates; latitude/longitude null). */
    public record UavPin(
            Long id,
            String model,
            String serialNumber,
            String manufacturer,
            String status,
            Long stationId,
            String stationName,
            LocalDateTime lastMaintenanceAt,
            String positionSource,
            Double latitude,
            Double longitude,
            ActiveMission activeMission) {}

    public record ActiveMission(
            Long id,
            String code,
            String title,
            String status,
            String locationName,
            LocalDateTime startTime) {}

    public record StationPin(
            Long id,
            String code,
            String name,
            Double latitude,
            Double longitude,
            String status,
            long uavCount) {}
}
