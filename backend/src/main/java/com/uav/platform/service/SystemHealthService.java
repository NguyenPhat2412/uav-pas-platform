package com.uav.platform.service;

import com.uav.platform.dto.response.SystemHealthResponse;

public interface SystemHealthService {
    SystemHealthResponse check();
}
