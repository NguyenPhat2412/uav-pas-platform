package com.uav.platform.modules.maintenance.dto.request;

import com.uav.platform.modules.maintenance.enums.DueStatus;

/** Optional schedule filters; pagination remains separate transport metadata. */
public record MaintenanceScheduleQueryRequest(Long uavId, DueStatus dueStatus) {}
