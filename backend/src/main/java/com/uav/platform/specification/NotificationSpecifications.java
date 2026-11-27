package com.uav.platform.specification;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.Notification;
import com.uav.platform.enums.NotificationType;

public final class NotificationSpecifications {

    private NotificationSpecifications() {}

    public static HibernateSpecification<Notification> belongsToUser(Long userId) {
        return (root, query, cb) ->
                userId == null ? null : cb.equal(root.get("user").get("id"), userId);
    }

    public static HibernateSpecification<Notification> isUnread() {
        return (root, query, cb) -> cb.isFalse(root.get("isRead"));
    }

    public static HibernateSpecification<Notification> hasType(NotificationType type) {
        return (root, query, cb) -> type == null ? null : cb.equal(root.get("type"), type);
    }
}
