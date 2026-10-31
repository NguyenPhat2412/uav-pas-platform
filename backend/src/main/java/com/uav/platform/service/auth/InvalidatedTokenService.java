package com.uav.platform.service.auth;

import java.time.Instant;

/**
 * Service quản lý danh sách Access Token đã bị thu hồi (Blacklist).
 */
public interface InvalidatedTokenService {

    void invalidate(String token);

    void invalidate(String tokenId, Instant expiryTime);

    boolean isInvalidated(String token);

    void purgeExpiredTokens();
}
