package com.uav.platform.dto.request.notification.policy;

import com.uav.platform.enums.notification.NotificationSeverity;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateNotificationModulePolicyRequest(
        @NotNull Boolean enabled,
        @NotNull NotificationSeverity severity,
        @NotNull Boolean mandatory,
        @NotNull Boolean inAppEnabled,
        @NotNull Boolean screenPopupEnabled,
        @NotNull Boolean desktopOsEnabled,
        @NotNull Boolean mobilePushEnabled,
        @NotNull Boolean emailEnabled,
        @NotNull @Min(0) @Max(86400) Integer cooldownSeconds) {}
