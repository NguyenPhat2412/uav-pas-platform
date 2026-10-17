package com.uav.platform.modules.user.mapper;

import com.uav.platform.modules.user.dto.response.UserResponse;
import com.uav.platform.modules.user.entity.AppUser;

/** Maps the user aggregate to its public response contract. */
public final class UserMapper {
    private UserMapper() {}

    public static UserResponse toResponse(AppUser user) {
        if (user == null) return null;
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getRole() != null
                        ? user.getRole()
                        : com.uav.platform.modules.user.enums.UserRole.ROLE_PILOT,
                user.getStatus(),
                user.getCreatedAt());
    }
}
