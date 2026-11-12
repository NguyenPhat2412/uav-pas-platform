package com.uav.platform.service.dashboard;

import com.uav.platform.dto.response.dashboard.DashboardResponse;
import com.uav.platform.dto.response.dashboard.MissionDashboardResponse;

import org.springframework.security.core.Authentication;

public interface DashboardService {
    DashboardResponse summary(Authentication authentication);

    MissionDashboardResponse missionSummary(Authentication authentication);
}
