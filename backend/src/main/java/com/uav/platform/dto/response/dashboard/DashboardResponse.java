package com.uav.platform.dto.response.dashboard;

public record DashboardResponse(
        long totalUsers,
        long totalStations,
        long totalUavs,
        long availableUavs,
        long maintenanceUavs,
        long totalEquipmentUnits,
        long reservedEquipmentUnits,
        long totalMediaAssets,
        long totalAuditEvents) {}
