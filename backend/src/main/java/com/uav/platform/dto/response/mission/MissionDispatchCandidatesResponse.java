package com.uav.platform.dto.response.mission;

import com.uav.platform.enums.mission.MissionStatus;

import java.util.List;

public record MissionDispatchCandidatesResponse(
        Long missionId,
        String missionCode,
        MissionStatus missionStatus,
        Long recommendedStationId,
        Long recommendedUavId,
        Long recommendedOperatorId,
        Long recommendedEquipmentId,
        boolean canAutoAssign,
        List<StationCandidate> stations,
        List<UavCandidate> uavs,
        List<OperatorCandidate> operators,
        List<EquipmentCandidate> equipment) {

    public record StationCandidate(
            Long id,
            String code,
            String name,
            Double distanceKm,
            int availableUavCount,
            int availableEquipmentCount,
            int score,
            boolean eligible,
            String reason) {}

    public record UavCandidate(
            Long id,
            String serialNumber,
            String model,
            Long stationId,
            String stationName,
            Double distanceKm,
            Integer batteryPct,
            Long daysSinceMaintenance,
            int score,
            boolean eligible,
            String conflictReason) {}

    public record OperatorCandidate(
            Long id,
            String username,
            String fullName,
            int sameDayMissionCount,
            long completedMissionCount,
            Double averageRating,
            int score,
            boolean eligible,
            String conflictReason) {}

    public record EquipmentCandidate(
            Long id,
            String name,
            String category,
            Long stationId,
            int availableQuantity,
            int score,
            boolean eligible,
            String reason) {}
}
