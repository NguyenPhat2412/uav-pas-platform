package com.uav.platform.service.impl.notification;

import com.uav.platform.entity.notification.Notification;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.notification.NotificationType;

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
