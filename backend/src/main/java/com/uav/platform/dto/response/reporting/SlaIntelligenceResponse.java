package com.uav.platform.dto.response.reporting;

import java.time.LocalDateTime;
import java.util.List;

public record SlaIntelligenceResponse(
        long totalEvaluatedMissions,
        long completedMissions,
        double avgConfirmationMinutes,
        double onTimeCompletionRate,
        double preflightComplianceRate,
        Double avgCustomerRating,
        long acceptedDeliverablesCount,
        long totalReviewsCount,
        long dueSoonUavCount,
        long overdueUavCount,
        List<OperatorSlaRow> operatorLeaderboard,
        List<UavMaintenanceRiskRow> fleetMaintenanceRisks,
        List<CustomerReviewRow> recentReviews) {

    public record OperatorSlaRow(
            Long operatorId,
            String username,
            String fullName,
            long completedMissions,
            double totalFlightHours,
            double onTimeRate,
            double preflightComplianceRate,
            Double avgRating,
            long reviewCount) {}

    public record UavMaintenanceRiskRow(
            Long uavId,
            String serialNumber,
            String model,
            String status,
            String stationName,
            LocalDateTime lastMaintenanceAt,
            Long daysSinceMaintenance,
            long missionsSinceMaintenance,
            double flightHoursSinceMaintenance,
            Integer latestBatteryPct,
            boolean hasOpenRepairOrder,
            String riskLevel,
            int riskScore,
            String recommendation) {}

    public record CustomerReviewRow(
            Long reviewId,
            Long missionId,
            String missionCode,
            String missionTitle,
            String customerName,
            String operatorName,
            int overallRating,
            int dataQualityRating,
            int timelinessRating,
            boolean deliverablesAccepted,
            String comment,
            LocalDateTime updatedAt) {}
}
