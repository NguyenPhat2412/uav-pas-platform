package com.uav.platform.dto.request.notification.policy;

import jakarta.validation.constraints.NotNull;

public record UpdateUserNotificationPreferenceRequest(
        @NotNull Boolean muted,
        @NotNull Boolean screenPopupEnabled,
        @NotNull Boolean desktopOsEnabled,
        @NotNull Boolean mobilePushEnabled,
        @NotNull Boolean emailEnabled) {}
