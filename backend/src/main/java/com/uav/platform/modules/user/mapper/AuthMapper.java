package com.uav.platform.modules.user.mapper;

import com.uav.platform.modules.user.config.response.AuthResponse;
import com.uav.platform.modules.user.config.response.UserResponse;

/** Central mapping boundary for authentication responses. */
public final class AuthMapper {
    private AuthMapper() {}
    public static AuthResponse toResponse(String accessToken, String refreshToken, UserResponse user) {
        return new AuthResponse(accessToken, "Bearer", refreshToken, user);
    }
}
