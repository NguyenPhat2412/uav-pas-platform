package com.uav.platform.dto.record;

import com.uav.platform.enums.NotificationModuleCode;
import com.uav.platform.enums.NotificationSeverity;

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
