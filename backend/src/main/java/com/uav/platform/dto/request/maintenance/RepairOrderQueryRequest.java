package com.uav.platform.dto.request.maintenance;

import com.uav.platform.enums.maintenance.RepairStatus;

/** Optional repair-order filters; null components retain the unfiltered query behavior. */
public record RepairOrderQueryRequest(Long uavId, RepairStatus status) {}
