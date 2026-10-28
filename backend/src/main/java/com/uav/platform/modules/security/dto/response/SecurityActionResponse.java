package com.uav.platform.modules.security.dto.response;

import java.time.Instant;

/** Result of an admin security action (session revocation or 2FA reset). */
public record SecurityActionResponse(
        String action,
        int affectedUsers,
        int refreshTokensRevoked,
        boolean includesCurrentUser,
        Instant effectiveAt) {}
