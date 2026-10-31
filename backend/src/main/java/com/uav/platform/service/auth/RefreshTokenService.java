package com.uav.platform.service.auth;

import com.uav.platform.entity.auth.RefreshToken;
import com.uav.platform.entity.user.AppUser;

import java.util.Optional;

/**
 * Service quản lý vòng đời Refresh Token: cấp mới, kiểm tra hạn, thu hồi và dọn dẹp token hết hạn.
 */
public interface RefreshTokenService {

    RefreshToken createRefreshToken(AppUser user);

    Optional<RefreshToken> findByToken(String token);

    Optional<Long> findUserIdByToken(String token);

    /** Owner lock precedes exact-token re-read and is retained by the auth transaction. */
    Optional<RefreshToken> findByTokenForUpdate(String token);

    RefreshToken verifyExpiration(RefreshToken token);

    void revokeToken(String token);

    int deleteByUser(AppUser user);

    void purgeExpiredTokens();
}
