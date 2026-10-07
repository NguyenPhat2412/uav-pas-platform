package com.uav.platform.modules.user.service;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.entity.RefreshToken;

import java.util.Optional;

/**
 * Service quản lý vòng đời Refresh Token: cấp mới, kiểm tra hạn, thu hồi và dọn dẹp token hết hạn.
 */
public interface RefreshTokenService {

    RefreshToken createRefreshToken(AppUser user);

    Optional<RefreshToken> findByToken(String token);

    RefreshToken verifyExpiration(RefreshToken token);

    void revokeToken(String token);

    int deleteByUser(AppUser user);

    void purgeExpiredTokens();
}
