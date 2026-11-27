package com.uav.platform.dto.response;

import com.uav.platform.enums.NotificationModuleCode;
import com.uav.platform.enums.NotificationSeverity;

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
