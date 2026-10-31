package com.uav.platform.dto.request.maintenance;

import com.uav.platform.enums.maintenance.DueStatus;

/** Optional schedule filters; pagination remains separate transport metadata. */
public record MaintenanceScheduleQueryRequest(Long uavId, DueStatus dueStatus) {}
