package com.uav.platform.dto.response.support;

public record SupportAdminSummaryResponse(
        long totalThreads,
        long openThreads,
        long inProgressThreads,
        long resolvedThreads,
        long unreadThreads,
        long unreadMessages) {}
