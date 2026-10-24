package com.uav.platform.modules.dashboard.service;

import com.uav.platform.modules.dashboard.dto.response.SystemHealthResponse;

public interface SystemHealthService {
    SystemHealthResponse check();
}
