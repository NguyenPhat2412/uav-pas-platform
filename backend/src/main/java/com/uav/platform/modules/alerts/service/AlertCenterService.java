package com.uav.platform.modules.alerts.service;

import com.uav.platform.modules.alerts.dto.response.AlertCenterResponse;

public interface AlertCenterService {
    /** Read-only aggregation of current operational issues across modules. */
    AlertCenterResponse current();
}
