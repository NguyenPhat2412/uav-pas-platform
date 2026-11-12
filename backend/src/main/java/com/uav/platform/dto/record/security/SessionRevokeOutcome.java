package com.uav.platform.dto.record.security;

import java.time.Instant;

/** What a single-user revocation changed: refresh tokens revoked and the access-token cut-off. */
public record SessionRevokeOutcome(int refreshTokens, Instant cutoff) {}
