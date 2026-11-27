package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.CreateNotificationRequest;
import com.uav.platform.dto.request.RegisterPushTokenRequest;
import com.uav.platform.dto.response.NotificationResponse;
import com.uav.platform.dto.response.PushTokenResponse;

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
