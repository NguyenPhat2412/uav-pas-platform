package com.uav.platform.modules.auth.repository;

import com.uav.platform.modules.auth.entity.InvalidatedToken;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface InvalidatedTokenRepository
        extends JpaRepository<InvalidatedToken, Long>, JpaSpecificationExecutor<InvalidatedToken> {

    boolean existsByTokenId(String tokenId);

    @Modifying
    int deleteByExpiryTimeBefore(Instant now);

    default int deleteExpiredTokens(Instant now) {
        return deleteByExpiryTimeBefore(now);
    }
}
