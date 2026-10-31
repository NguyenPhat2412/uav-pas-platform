package com.uav.platform.service.dashboard;

import com.uav.platform.dto.response.dashboard.CustomerAnalyticsResponse;

import org.springframework.security.core.Authentication;

public interface CustomerAnalyticsService {
    CustomerAnalyticsResponse analytics(Authentication authentication);
}
