package com.uav.platform.service.dashboard;

import com.uav.platform.dto.response.dashboard.AdminAnalyticsResponse;

import org.springframework.security.core.Authentication;

public interface AdminAnalyticsService {
    /** Analytics for the {@code days} days ending today (clamped to 7..366). */
    AdminAnalyticsResponse analytics(int days, Authentication authentication);
}
