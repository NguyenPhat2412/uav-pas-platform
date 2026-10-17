package com.uav.platform.modules.reporting.dto.response;

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
