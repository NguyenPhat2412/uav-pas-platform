package com.uav.platform.dto.response.notification.policy;

import com.uav.platform.enums.notification.NotificationModuleCode;
import com.uav.platform.enums.notification.NotificationSeverity;

import java.time.LocalDateTime;

public record NotificationModulePolicyResponse(
        Long id,
        NotificationModuleCode moduleCode,
        String displayNameVi,
        String displayNameEn,
        String displayNameJa,
        String descriptionVi,
        String descriptionEn,
        String descriptionJa,
        NotificationSeverity severity,
        Boolean enabled,
        Boolean mandatory,
        Boolean inAppEnabled,
        Boolean screenPopupEnabled,
        Boolean desktopOsEnabled,
        Boolean mobilePushEnabled,
        Boolean emailEnabled,
        Integer cooldownSeconds,
        Integer sortOrder,
        LocalDateTime updatedAt) {}
