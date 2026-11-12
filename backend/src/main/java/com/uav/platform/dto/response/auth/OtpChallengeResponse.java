package com.uav.platform.dto.response.auth;

public record OtpChallengeResponse(
        String challengeToken,
        String email,
        String maskedEmail,
        String purpose,
        String method,
        int expiresInSeconds,
        String message,
        String devOtpPreview) {}
