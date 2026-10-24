package com.uav.platform.modules.auth.dto.response;

public record TwoFactorStatusResponse(
        boolean enabled,
        String method,
        boolean emailVerified,
        boolean totpConfigured,
        String email,
        String maskedEmail) {}
