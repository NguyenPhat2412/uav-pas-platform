package com.uav.platform.modules.auth.dto.response;

public record OtpChallengeResponse(
        String challengeToken,
        String email,
        String maskedEmail,
        String purpose,
        String method,
        int expiresInSeconds,
        String message,
        String devOtpPreview) {}
