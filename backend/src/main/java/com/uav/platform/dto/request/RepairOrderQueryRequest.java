package com.uav.platform.dto.request;

import com.uav.platform.enums.RepairStatus;

/** Optional repair-order filters; null components retain the unfiltered query behavior. */
public record RepairOrderQueryRequest(Long uavId, RepairStatus status) {}
