package com.uav.platform.dto.response.notification;

import com.uav.platform.enums.notification.NotificationType;

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
