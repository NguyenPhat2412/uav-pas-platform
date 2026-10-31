package com.uav.platform.dto.response.reporting;

public record OperationsReportResponse(
        long totalMissions,
        long completedMissions,
        long failedMissions,
        double totalFlightHours,
        long activeUavCount,
        long maintenanceUavCount,
        long totalStationsCount,
        long sarOperationsCount,
        long victimsRescuedCount,
        double missionSuccessRate) {}
