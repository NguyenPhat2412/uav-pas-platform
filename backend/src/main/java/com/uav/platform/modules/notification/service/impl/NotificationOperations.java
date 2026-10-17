package com.uav.platform.modules.notification.service.impl;

import com.uav.platform.modules.notification.entity.Notification;
import com.uav.platform.modules.notification.enums.NotificationType;
import com.uav.platform.modules.user.entity.AppUser;

/** Internal creation rules shared by application services and setup callers. */
public final class NotificationOperations {
    private NotificationOperations() {}

    public static Notification create(
            AppUser user,
            String title,
            String content,
            NotificationType type,
            String referenceType,
            Long referenceId) {
        Notification entity = new Notification();
        entity.setUser(user);
        entity.setTitle(title);
        entity.setContent(content);
        entity.setType(type != null ? type : NotificationType.SYSTEM);
        entity.setReferenceType(referenceType);
        entity.setReferenceId(referenceId);
        entity.setIsRead(false);
        return entity;
    }
}
