package com.uav.platform.modules.notification.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.notification.config.request.CreateNotificationRequest;
import com.uav.platform.modules.notification.config.response.NotificationResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

public interface NotificationService {
    PageResponse<NotificationResponse> listForUser(Authentication auth, Pageable pageable);
    long countUnread(Authentication auth);
    NotificationResponse markAsRead(Long id, Authentication auth);
    void markAllAsRead(Authentication auth);
    NotificationResponse sendNotification(CreateNotificationRequest request);
}
