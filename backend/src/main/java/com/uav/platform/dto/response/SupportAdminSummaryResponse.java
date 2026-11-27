package com.uav.platform.dto.response;

public record SupportAdminSummaryResponse(
        long totalThreads,
        long openThreads,
        long inProgressThreads,
        long resolvedThreads,
        long unreadThreads,
        long unreadMessages) {}
