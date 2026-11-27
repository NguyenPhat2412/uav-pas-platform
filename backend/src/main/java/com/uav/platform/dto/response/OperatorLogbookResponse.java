package com.uav.platform.dto.response;

import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.MissionType;

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
