package com.uav.platform.modules.auth.dto.response;

public record TwoFactorSetupResponse(
        String method,
        String secret,
        String otpauthUri,
        String issuer,
        String accountName,
        String challengeToken,
        String maskedEmail,
        String devOtpPreview,
        String message) {}
