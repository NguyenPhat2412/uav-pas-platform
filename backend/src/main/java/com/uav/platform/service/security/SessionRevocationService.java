package com.uav.platform.service.security;

import java.time.Instant;

/** Admin-initiated "sign out everywhere": records a cut-off and answers the JWT filter. */
public interface SessionRevocationService {

    /** True when an access token issued at {@code issuedAt} for this user has been revoked. */
    boolean isRevoked(Long userId, Instant issuedAt);

    /**
     * Rejects every access token of these users issued up to now and returns the cut-off. Refresh
     * tokens are revoked separately by the caller.
     */
    Instant revokeAccessTokens(java.util.Collection<Long> userIds, String actor);
}
