package com.uav.platform.dao.notification;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.notification.Notification;
import com.uav.platform.enums.notification.NotificationModuleCode;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface INotificationDao extends IGenericDao<Long, Notification> {
    Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserIdAndIsReadFalse(Long userId);

    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    boolean existsByUserIdAndModuleCodeAndCreatedAtAfter(
            Long userId, NotificationModuleCode moduleCode, LocalDateTime cutoff);

    void markAllAsReadForUser(Long userId);
}
