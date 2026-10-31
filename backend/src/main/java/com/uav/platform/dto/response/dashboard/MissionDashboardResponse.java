package com.uav.platform.dto.response.dashboard;

public record MissionDashboardResponse(
        long totalMissions,
        long pendingMissions,
        long confirmedMissions,
        long readyMissions,
        long inProgressMissions,
        long completedMissions,
        long failedMissions) {}
