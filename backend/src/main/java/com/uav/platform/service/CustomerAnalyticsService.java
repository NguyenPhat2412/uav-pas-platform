package com.uav.platform.service;

import com.uav.platform.dto.response.CustomerAnalyticsResponse;

import org.springframework.security.core.Authentication;

public interface CustomerAnalyticsService {
    CustomerAnalyticsResponse analytics(Authentication authentication);
}
