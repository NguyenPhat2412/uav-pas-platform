package com.uav.platform.dto.record.notification;

import com.uav.platform.enums.notification.NotificationType;

public record NotificationDeliveryPayload(
        Long notificationId,
        Long userId,
        String userEmail,
        String userFullName,
        String title,
        String content,
        NotificationType type,
        String referenceType,
        Long referenceId) {}
