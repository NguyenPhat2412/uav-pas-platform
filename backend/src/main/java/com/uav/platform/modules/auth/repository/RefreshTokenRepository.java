package com.uav.platform.modules.auth.repository;

import com.uav.platform.modules.auth.entity.RefreshToken;
import com.uav.platform.modules.user.entity.AppUser;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, Long>, JpaSpecificationExecutor<RefreshToken> {

    Optional<RefreshToken> findByToken(String token);

    @Query("select r.user.id from RefreshToken r where r.token = :token")
    Optional<Long> findUserIdByToken(@Param("token") String token);

    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RefreshToken r where r.token = :token")
    Optional<RefreshToken> findByTokenForUpdate(@Param("token") String token);

    Optional<RefreshToken> findByUser(AppUser user);

    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.user = :user")
    int deleteByUser(@Param("user") AppUser user);

    @Modifying
    int deleteByExpiryDateBefore(Instant now);

    default int deleteExpiredTokens(Instant now) {
        return deleteByExpiryDateBefore(now);
    }
}
