package com.uav.platform.modules.dashboard.service;

import com.uav.platform.modules.dashboard.dto.response.AdminAnalyticsResponse;

import org.springframework.security.core.Authentication;

public interface AdminAnalyticsService {
    /** Analytics for the {@code days} days ending today (clamped to 7..366). */
    AdminAnalyticsResponse analytics(int days, Authentication authentication);
}
