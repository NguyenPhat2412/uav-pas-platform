package com.uav.platform.dto.response.auth;

import com.uav.platform.dto.response.user.UserResponse;

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
        @Schema(description = "Authenticated user profile details") UserResponse user,
        @Schema(description = "True when OTP or 2FA verification is required before token issuance")
                Boolean mfaRequired,
        @Schema(description = "Required verification method: EMAIL, TOTP, or EMAIL_VERIFY")
                String mfaMethod,
        @Schema(description = "Opaque challenge token for OTP / 2FA verification")
                String challengeToken,
        @Schema(description = "Masked email destination for OTP delivery") String maskedEmail,
        @Schema(description = "Development-only OTP preview when SMTP is disabled")
                String devOtpPreview) {
    public AuthResponse(
            String accessToken, String tokenType, String refreshToken, UserResponse user) {
        this(accessToken, tokenType, refreshToken, user, false, null, null, null, null);
    }

    public AuthResponse(String accessToken, String tokenType, UserResponse user) {
        this(accessToken, tokenType, null, user, false, null, null, null, null);
    }

    public static AuthResponse of(String accessToken, UserResponse user) {
        return new AuthResponse(accessToken, "Bearer", null, user, false, null, null, null, null);
    }

    public static AuthResponse of(String accessToken, String refreshToken, UserResponse user) {
        return new AuthResponse(
                accessToken, "Bearer", refreshToken, user, false, null, null, null, null);
    }

    public static AuthResponse challenge(
            String mfaMethod,
            String challengeToken,
            String maskedEmail,
            String devOtpPreview,
            UserResponse user) {
        return new AuthResponse(
                null,
                "Bearer",
                null,
                user,
                true,
                mfaMethod,
                challengeToken,
                maskedEmail,
                devOtpPreview);
    }
}
