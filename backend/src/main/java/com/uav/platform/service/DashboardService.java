package com.uav.platform.service;

import com.uav.platform.dto.response.DashboardResponse;
import com.uav.platform.dto.response.MissionDashboardResponse;

import org.springframework.security.core.Authentication;

public interface DashboardService {
    DashboardResponse summary(Authentication authentication);

    MissionDashboardResponse missionSummary(Authentication authentication);
}
