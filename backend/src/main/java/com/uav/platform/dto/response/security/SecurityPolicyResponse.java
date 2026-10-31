package com.uav.platform.dto.response.security;

import java.util.List;

/** Non-secret authentication configuration currently in effect, plus findings. */
public record SecurityPolicyResponse(
        long accessTokenExpirationMs,
        long refreshTokenExpirationMs,
        int otpTtlMinutes,
        String totpIssuer,
        boolean otpDevPreview,
        boolean cookieSecure,
        String cookieSameSite,
        String cookieDomain,
        List<String> corsAllowedOrigins,
        boolean mailEnabled,
        List<String> activeProfiles,
        boolean productionLike,
        List<SecurityWarningResponse> warnings) {}
