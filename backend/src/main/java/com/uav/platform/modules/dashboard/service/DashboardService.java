package com.uav.platform.modules.dashboard.service;



import com.uav.platform.modules.dashboard.config.response.DashboardResponse;
import org.springframework.security.core.Authentication;
import com.uav.platform.modules.dashboard.config.response.MissionDashboardResponse;

public interface DashboardService {
    DashboardResponse summary(Authentication authentication);
    MissionDashboardResponse missionSummary(Authentication authentication);
}
