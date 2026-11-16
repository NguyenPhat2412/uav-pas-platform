package com.uav.platform.dto.record.notification.delivery;

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
        Long referenceId,
        Boolean mobilePushAllowed,
        Boolean emailAllowed) {

    public NotificationDeliveryPayload(
            Long notificationId,
            Long userId,
            String userEmail,
            String userFullName,
            String title,
            String content,
            NotificationType type,
            String referenceType,
            Long referenceId) {
        this(
                notificationId,
                userId,
                userEmail,
                userFullName,
                title,
                content,
                type,
                referenceType,
                referenceId,
                null,
                null);
    }
}
