package com.uav.platform.modules.user.service;


import com.uav.platform.modules.user.common.*;

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
