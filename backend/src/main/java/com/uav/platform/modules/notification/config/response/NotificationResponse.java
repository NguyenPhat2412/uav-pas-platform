package com.uav.platform.modules.notification.config.response;

import com.uav.platform.modules.notification.common.NotificationType;
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
    LocalDateTime createdAt
) {}
