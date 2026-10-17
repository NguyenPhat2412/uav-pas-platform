package com.uav.platform.modules.dashboard.mapper;

import com.uav.platform.modules.dashboard.dto.response.DashboardResponse;
import com.uav.platform.modules.dashboard.dto.response.MissionDashboardResponse;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

/** Keeps dashboard response construction outside the service layer. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface DashboardMapper {

    DashboardResponse toResponse(
            long totalUsers,
            long totalStations,
            long totalUavs,
            long availableUavs,
            long maintenanceUavs,
            long totalEquipmentUnits,
            long reservedEquipmentUnits,
            long totalMediaAssets,
            long totalAuditEvents);

    MissionDashboardResponse toMissionResponse(
            long totalMissions,
            long pendingMissions,
            long confirmedMissions,
            long readyMissions,
            long inProgressMissions,
            long completedMissions,
            long failedMissions);
}
