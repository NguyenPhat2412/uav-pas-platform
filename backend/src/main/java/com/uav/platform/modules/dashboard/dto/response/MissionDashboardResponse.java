package com.uav.platform.modules.dashboard.dto.response;

public record MissionDashboardResponse(
        long totalMissions,
        long pendingMissions,
        long confirmedMissions,
        long readyMissions,
        long inProgressMissions,
        long completedMissions,
        long failedMissions) {}
