package com.uav.platform.modules.maintenance.dto.request;

import com.uav.platform.modules.maintenance.enums.RepairStatus;

/** Optional repair-order filters; null components retain the unfiltered query behavior. */
public record RepairOrderQueryRequest(Long uavId, RepairStatus status) {}
