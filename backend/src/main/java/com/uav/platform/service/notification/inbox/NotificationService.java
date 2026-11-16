package com.uav.platform.service.notification.inbox;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.notification.delivery.RegisterPushTokenRequest;
import com.uav.platform.dto.request.notification.inbox.CreateNotificationRequest;
import com.uav.platform.dto.response.notification.delivery.PushTokenResponse;
import com.uav.platform.dto.response.notification.inbox.NotificationResponse;

import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

public interface NotificationService {
    PageResponse<NotificationResponse> listForUser(Authentication auth, Pageable pageable);

    long countUnread(Authentication auth);

    NotificationResponse markAsRead(Long id, Authentication auth);

    void markAllAsRead(Authentication auth);

    NotificationResponse sendNotification(CreateNotificationRequest request);

    PushTokenResponse registerPushToken(RegisterPushTokenRequest request, Authentication auth);

    void unregisterPushToken(String token, Authentication auth);
}
