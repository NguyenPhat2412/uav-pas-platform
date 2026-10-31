package com.uav.platform.service.alerts;

import com.uav.platform.dto.response.alerts.AlertCenterResponse;

public interface AlertCenterService {
    /** Read-only aggregation of current operational issues across modules. */
    AlertCenterResponse current();
}
