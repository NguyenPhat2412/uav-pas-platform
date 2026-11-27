package com.uav.platform.dto.response;

import com.uav.platform.enums.PushPlatform;

import java.time.LocalDateTime;

public record PushTokenResponse(
        Long id,
        Long userId,
        String token,
        PushPlatform platform,
        String deviceName,
        boolean active,
        LocalDateTime lastSeenAt) {}
