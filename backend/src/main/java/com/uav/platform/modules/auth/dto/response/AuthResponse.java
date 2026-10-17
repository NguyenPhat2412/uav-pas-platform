package com.uav.platform.modules.auth.dto.response;

import com.uav.platform.modules.user.dto.response.UserResponse;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Authentication token response containing access and refresh tokens")
public record AuthResponse(
        @Schema(description = "JWT Access Token", example = "eyJhbGciOiJIUzI1NiJ9...")
                String accessToken,
        @Schema(description = "Authentication scheme type", example = "Bearer") String tokenType,
        @Schema(
                        description = "Opaque refresh token for obtaining new access tokens",
                        example = "a2d1f4b8-...")
                String refreshToken,
        @Schema(description = "Authenticated user profile details") UserResponse user) {
    public AuthResponse(String accessToken, String tokenType, UserResponse user) {
        this(accessToken, tokenType, null, user);
    }

    public static AuthResponse of(String accessToken, UserResponse user) {
        return new AuthResponse(accessToken, "Bearer", null, user);
    }

    public static AuthResponse of(String accessToken, String refreshToken, UserResponse user) {
        return new AuthResponse(accessToken, "Bearer", refreshToken, user);
    }
}
