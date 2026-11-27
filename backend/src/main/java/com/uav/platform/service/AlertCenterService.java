package com.uav.platform.service;

import com.uav.platform.dto.response.AlertCenterResponse;

public interface AlertCenterService {
    /** Read-only aggregation of current operational issues across modules. */
    AlertCenterResponse current();
}
