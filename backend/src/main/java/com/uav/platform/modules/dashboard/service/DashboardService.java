package com.uav.platform.modules.dashboard.service;

import com.uav.platform.modules.dashboard.dto.response.DashboardResponse;
import com.uav.platform.modules.dashboard.dto.response.MissionDashboardResponse;

import org.springframework.security.core.Authentication;

public interface DashboardService {
    DashboardResponse summary(Authentication authentication);

    MissionDashboardResponse missionSummary(Authentication authentication);
}
