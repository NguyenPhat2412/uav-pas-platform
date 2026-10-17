package com.uav.platform.modules.notification.dto.request;

import com.uav.platform.modules.notification.enums.NotificationType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateNotificationRequest(
        @NotNull Long userId,
        @NotBlank String title,
        @NotBlank String content,
        NotificationType type,
        String referenceType,
        Long referenceId) {}
