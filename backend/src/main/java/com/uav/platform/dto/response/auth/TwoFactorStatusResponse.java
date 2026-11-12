package com.uav.platform.dto.response.auth;

public record TwoFactorStatusResponse(
        boolean enabled,
        String method,
        boolean emailVerified,
        boolean totpConfigured,
        String email,
        String maskedEmail) {}
