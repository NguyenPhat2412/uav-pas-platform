package com.uav.platform.repository.auth;

import com.uav.platform.entity.auth.RefreshToken;
import com.uav.platform.entity.user.AppUser;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
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

    @Query("select r from RefreshToken r where r.user.id in :userIds")
    List<RefreshToken> findByUserIdIn(@Param("userIds") Collection<Long> userIds);

    @Modifying
    @Query(
            "update RefreshToken r set r.revoked = true"
                    + " where r.user.id = :userId and r.revoked = false")
    int revokeByUserId(@Param("userId") Long userId);

    @Modifying
    @Query(
            "update RefreshToken r set r.revoked = true"
                    + " where r.user.id <> :excludedUserId and r.revoked = false")
    int revokeAllExceptUserId(@Param("excludedUserId") Long excludedUserId);

    @Modifying
    int deleteByExpiryDateBefore(Instant now);

    default int deleteExpiredTokens(Instant now) {
        return deleteByExpiryDateBefore(now);
    }
}
