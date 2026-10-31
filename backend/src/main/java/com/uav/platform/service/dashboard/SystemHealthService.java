package com.uav.platform.service.dashboard;

import com.uav.platform.dto.response.dashboard.SystemHealthResponse;

public interface SystemHealthService {
    SystemHealthResponse check();
}
