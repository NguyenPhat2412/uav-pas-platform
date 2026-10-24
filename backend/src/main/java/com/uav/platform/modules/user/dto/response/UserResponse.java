package com.uav.platform.modules.user.dto.response;

import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;

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
        LocalDateTime createdAt,
        boolean locked) {
    public UserResponse(
            Long id,
            String username,
            String email,
            String phoneNumber,
            String fullName,
            String avatarUrl,
            UserRole role,
            UserStatus status,
            LocalDateTime createdAt) {
        this(id, username, email, phoneNumber, fullName, avatarUrl, role, status, createdAt, false);
    }

    public UserResponse(
            Long id,
            String username,
            String email,
            String phoneNumber,
            UserStatus status,
            LocalDateTime createdAt) {
        this(id, username, email, phoneNumber, null, null, UserRole.ROLE_PILOT, status, createdAt, false);
    }
}
