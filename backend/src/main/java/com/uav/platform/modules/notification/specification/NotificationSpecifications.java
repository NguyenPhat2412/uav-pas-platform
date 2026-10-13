package com.uav.platform.modules.notification.specification;

import com.uav.platform.modules.notification.common.NotificationType;
import com.uav.platform.modules.notification.entity.Notification;
import org.springframework.data.jpa.domain.Specification;

public final class NotificationSpecifications {

    private NotificationSpecifications() {}

    public static Specification<Notification> belongsToUser(Long userId) {
        return (root, query, cb) -> userId == null ? null : cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<Notification> isUnread() {
        return (root, query, cb) -> cb.isFalse(root.get("isRead"));
    }

    public static Specification<Notification> hasType(NotificationType type) {
        return (root, query, cb) -> type == null ? null : cb.equal(root.get("type"), type);
    }
}
