package com.uav.platform.dto.response.security;

import java.time.Instant;

/**
 * One account's session state. Only metadata: token values are never exposed. {@code
 * sessionState} is ACTIVE, EXPIRED, REVOKED or NONE.
 */
public record SecuritySessionResponse(
        Long userId,
        String username,
        String email,
        String fullName,
        String role,
        String status,
        boolean activeSession,
        String sessionState,
        Instant sessionCreatedAt,
        Instant sessionExpiresAt,
        boolean twoFactorEnabled,
        String twoFactorMethod,
        Instant sessionsRevokedAt,
        String sessionsRevokedBy) {}
