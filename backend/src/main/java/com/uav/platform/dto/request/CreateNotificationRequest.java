package com.uav.platform.dto.request;

import com.uav.platform.enums.NotificationType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateNotificationRequest(
        @NotNull Long userId,
        @NotBlank String title,
        @NotBlank String content,
        NotificationType type,
        String referenceType,
        Long referenceId) {}
