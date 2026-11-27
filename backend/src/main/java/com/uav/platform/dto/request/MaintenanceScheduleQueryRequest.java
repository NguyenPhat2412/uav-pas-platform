package com.uav.platform.dto.request;

import com.uav.platform.enums.DueStatus;

/** Optional schedule filters; pagination remains separate transport metadata. */
public record MaintenanceScheduleQueryRequest(Long uavId, DueStatus dueStatus) {}
