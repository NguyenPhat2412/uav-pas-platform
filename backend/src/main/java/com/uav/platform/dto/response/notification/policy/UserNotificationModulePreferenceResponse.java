package com.uav.platform.dto.response.notification.policy;

import com.uav.platform.enums.notification.NotificationModuleCode;
import com.uav.platform.enums.notification.NotificationSeverity;

public record UserNotificationModulePreferenceResponse(
        NotificationModuleCode moduleCode,
        String displayNameVi,
        String displayNameEn,
        String displayNameJa,
        String descriptionVi,
        String descriptionEn,
        String descriptionJa,
        NotificationSeverity severity,
        Boolean moduleEnabled,
        Boolean mandatory,
        Boolean muted,
        Boolean adminScreenPopupEnabled,
        Boolean adminDesktopOsEnabled,
        Boolean adminMobilePushEnabled,
        Boolean adminEmailEnabled,
        Boolean screenPopupEnabled,
        Boolean desktopOsEnabled,
        Boolean mobilePushEnabled,
        Boolean emailEnabled) {}
