package com.uav.platform.modules.notification.mapper;

import com.uav.platform.modules.notification.config.response.NotificationResponse;
import com.uav.platform.modules.notification.entity.Notification;

public final class NotificationMapper {

    private NotificationMapper() {}

    public static NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
            n.getId(),
            n.getUser().getId(),
            n.getTitle(),
            n.getContent(),
            n.getType(),
            n.getReferenceType(),
            n.getReferenceId(),
            n.getIsRead(),
            n.getCreatedAt()
        );
    }
}
