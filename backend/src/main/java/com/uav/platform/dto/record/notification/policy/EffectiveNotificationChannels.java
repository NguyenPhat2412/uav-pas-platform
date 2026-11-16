package com.uav.platform.dto.record.notification.policy;

import com.uav.platform.enums.notification.NotificationModuleCode;
import com.uav.platform.enums.notification.NotificationSeverity;

public record EffectiveNotificationChannels(
        NotificationModuleCode moduleCode,
        NotificationSeverity severity,
        boolean enabled,
        boolean mandatory,
        boolean inApp,
        boolean screenPopup,
        boolean desktopOs,
        boolean mobilePush,
        boolean email,
        int cooldownSeconds) {}
