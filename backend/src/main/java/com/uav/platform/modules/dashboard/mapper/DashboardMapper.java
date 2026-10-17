package com.uav.platform.modules.dashboard.mapper;

import com.uav.platform.modules.dashboard.dto.response.DashboardResponse;
import com.uav.platform.modules.dashboard.dto.response.MissionDashboardResponse;

/** Keeps dashboard response construction outside the service layer. */
public final class DashboardMapper {
    private DashboardMapper() {}

    public static DashboardResponse toResponse(
            long totalUsers,
            long totalStations,
            long totalUavs,
            long availableUavs,
            long maintenanceUavs,
            long totalEquipmentUnits,
            long reservedEquipmentUnits,
            long totalMediaAssets,
            long totalAuditEvents) {
        return new DashboardResponse(
                totalUsers,
                totalStations,
                totalUavs,
                availableUavs,
                maintenanceUavs,
                totalEquipmentUnits,
                reservedEquipmentUnits,
                totalMediaAssets,
                totalAuditEvents);
    }

    public static MissionDashboardResponse toMissionResponse(
            long totalMissions,
            long pendingMissions,
            long confirmedMissions,
            long readyMissions,
            long inProgressMissions,
            long completedMissions,
            long failedMissions) {
        return new MissionDashboardResponse(
                totalMissions,
                pendingMissions,
                confirmedMissions,
                readyMissions,
                inProgressMissions,
                completedMissions,
                failedMissions);
    }
}
