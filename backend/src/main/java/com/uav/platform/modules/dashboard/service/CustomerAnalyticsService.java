package com.uav.platform.modules.dashboard.service;

import com.uav.platform.modules.dashboard.dto.response.CustomerAnalyticsResponse;

import org.springframework.security.core.Authentication;

public interface CustomerAnalyticsService {
    CustomerAnalyticsResponse analytics(Authentication authentication);
}
