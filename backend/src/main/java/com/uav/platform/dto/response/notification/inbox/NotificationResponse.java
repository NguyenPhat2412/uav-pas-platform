package com.uav.platform.dto.response.notification.inbox;

import com.uav.platform.enums.notification.NotificationModuleCode;
import com.uav.platform.enums.notification.NotificationSeverity;
import com.uav.platform.enums.notification.NotificationType;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        Long userId,
        String title,
        String content,
        NotificationType type,
        NotificationModuleCode moduleCode,
        NotificationSeverity severity,
        String referenceType,
        Long referenceId,
        Boolean isRead,
        LocalDateTime createdAt) {

    public NotificationResponse(
            Long id,
            Long userId,
            String title,
            String content,
            NotificationType type,
            String referenceType,
            Long referenceId,
            Boolean isRead,
            LocalDateTime createdAt) {
        this(
                id,
                userId,
                title,
                content,
                type,
                NotificationModuleCode.SYSTEM,
                NotificationSeverity.INFO,
                referenceType,
                referenceId,
                isRead,
                createdAt);
    }
}
