package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.InvalidatedToken;

import java.time.Instant;

public interface IInvalidatedTokenDao extends IGenericDao<Long, InvalidatedToken> {
    boolean existsByTokenId(String tokenId);

    int deleteByExpiryTimeBefore(Instant now);

    default int deleteExpiredTokens(Instant now) {
        return deleteByExpiryTimeBefore(now);
    }
}
