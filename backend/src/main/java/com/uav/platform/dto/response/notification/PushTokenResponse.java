package com.uav.platform.dto.response.notification;

import com.uav.platform.enums.notification.PushPlatform;

import java.time.LocalDateTime;

public record PushTokenResponse(
        Long id,
        Long userId,
        String token,
        PushPlatform platform,
        String deviceName,
        boolean active,
        LocalDateTime lastSeenAt) {}
