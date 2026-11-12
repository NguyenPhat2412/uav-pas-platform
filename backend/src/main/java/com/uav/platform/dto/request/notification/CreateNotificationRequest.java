package com.uav.platform.dto.request.notification;

import com.uav.platform.enums.notification.NotificationType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateNotificationRequest(
        @NotNull Long userId,
        @NotBlank String title,
        @NotBlank String content,
        NotificationType type,
        String referenceType,
        Long referenceId) {}
