package com.uav.platform.dto.response.mission;

import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.mission.MissionType;

import java.time.LocalDateTime;
import java.util.List;

public record OperatorLogbookResponse(
        String operatorUsername,
        String operatorFullName,
        long totalAssignedMissions,
        long completedMissions,
        double totalFlightHours,
        long preflightSignedCount,
        double preflightComplianceRate,
        Double averageCustomerRating,
        long reviewedMissionsCount,
        List<LoggedFlightEntry> recentFlights) {

    public record LoggedFlightEntry(
            Long missionId,
            String code,
            String title,
            MissionType missionType,
            MissionStatus status,
            String locationName,
            String uavSerialNumber,
            LocalDateTime startTime,
            LocalDateTime completedAt,
            double durationHours,
            boolean preflightCleared,
            Integer customerRating) {}
}
