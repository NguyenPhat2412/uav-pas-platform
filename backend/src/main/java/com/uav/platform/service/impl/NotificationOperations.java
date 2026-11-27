package com.uav.platform.service.impl;

import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Notification;
import com.uav.platform.enums.NotificationModuleCode;
import com.uav.platform.enums.NotificationSeverity;
import com.uav.platform.enums.NotificationType;

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
        return create(
                user,
                title,
                content,
                type,
                NotificationModuleCode.SYSTEM,
                NotificationSeverity.INFO,
                referenceType,
                referenceId);
    }

    public static Notification create(
            AppUser user,
            String title,
            String content,
            NotificationType type,
            NotificationModuleCode moduleCode,
            NotificationSeverity severity,
            String referenceType,
            Long referenceId) {
        Notification entity = new Notification();
        entity.setUser(user);
        entity.setTitle(title);
        entity.setContent(content);
        entity.setType(type != null ? type : NotificationType.SYSTEM);
        entity.setModuleCode(moduleCode != null ? moduleCode : NotificationModuleCode.SYSTEM);
        entity.setSeverity(severity != null ? severity : NotificationSeverity.INFO);
        entity.setReferenceType(referenceType);
        entity.setReferenceId(referenceId);
        entity.setIsRead(false);
        return entity;
    }
}
