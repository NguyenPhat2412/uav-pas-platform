package com.uav.platform.modules.user.config.response;

import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.common.UserRole;
import com.uav.platform.modules.user.common.UserStatus;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String username,
        String email,
        String phoneNumber,
        String fullName,
        String avatarUrl,
        UserRole role,
        UserStatus status,
    LocalDateTime createdAt
) {
    public UserResponse(Long id, String username, String email, String phoneNumber, UserStatus status, LocalDateTime createdAt) {
        this(id, username, email, phoneNumber, null, null, UserRole.ROLE_PILOT, status, createdAt);
    }
}
