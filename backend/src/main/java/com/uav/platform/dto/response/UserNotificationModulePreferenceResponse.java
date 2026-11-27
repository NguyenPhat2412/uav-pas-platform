package com.uav.platform.dto.response;

import com.uav.platform.enums.NotificationModuleCode;
import com.uav.platform.enums.NotificationSeverity;

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
