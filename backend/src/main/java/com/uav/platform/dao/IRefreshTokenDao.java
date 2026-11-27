package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.RefreshToken;
import com.uav.platform.enums.ClientKind;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface IRefreshTokenDao extends IGenericDao<Long, RefreshToken> {
    Optional<RefreshToken> findByToken(String token);

    Optional<Long> findUserIdByToken(String token);

    Optional<RefreshToken> findByTokenForUpdate(String token);

    List<RefreshToken> findByUser(AppUser user);

    int deleteByUser(AppUser user);

    int deleteByUserAndClient(AppUser user, ClientKind client);

    List<RefreshToken> findByUserIdIn(Collection<Long> userIds);

    int revokeByUserId(Long userId);

    int revokeAllExceptUserId(Long excludedUserId);

    int deleteByExpiryDateBefore(Instant now);

    default int deleteExpiredTokens(Instant now) {
        return deleteByExpiryDateBefore(now);
    }
}
