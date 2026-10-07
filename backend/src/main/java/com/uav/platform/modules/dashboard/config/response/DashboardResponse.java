package com.uav.platform.modules.dashboard.config.response;


public record DashboardResponse(long totalUsers, long totalStations, long totalUavs, long availableUavs,
                                long maintenanceUavs, long totalEquipmentUnits, long reservedEquipmentUnits,
                                long totalMediaAssets, long totalAuditEvents) { }
