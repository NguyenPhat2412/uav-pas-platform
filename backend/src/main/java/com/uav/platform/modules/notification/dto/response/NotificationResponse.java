package com.uav.platform.modules.notification.dto.response;

import com.uav.platform.modules.notification.enums.NotificationType;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        Long userId,
        String title,
        String content,
        NotificationType type,
        String referenceType,
        Long referenceId,
        Boolean isRead,
        LocalDateTime createdAt) {}
