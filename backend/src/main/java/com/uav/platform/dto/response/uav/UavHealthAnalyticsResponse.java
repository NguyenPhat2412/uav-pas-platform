package com.uav.platform.dto.response.uav;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Fleet-wide 3D airframe classification, battery cycle health, and predictive maintenance scoring.
 */
public record UavHealthAnalyticsResponse(
        int totalFleetCount,
        int optimalCount,
        int attentionCount,
        int criticalCount,
        double averageHealthScore,
        List<UavHealthProfile> profiles) {

    public record UavHealthProfile(
            Long uavId,
            String serialNumber,
            String model,
            String manufacturer,
            String status,
            String stationName,
            String airframeClass,
            int rotorCount,
            double maxSpeedMs,
            double maxWindKnots,
            int maxEnduranceMinutes,
            double maxPayloadKg,
            int healthScore,
            String healthTier,
            long completedMissionsCount,
            double totalFlightHours,
            long openRepairCount,
            long totalRepairCount,
            int motorHealthPct,
            int batteryStateOfHealthPct,
            int estimatedBatteryCycles,
            double predictedRemainingHours,
            LocalDateTime lastMaintenanceAt,
            String recommendation) {}
}
