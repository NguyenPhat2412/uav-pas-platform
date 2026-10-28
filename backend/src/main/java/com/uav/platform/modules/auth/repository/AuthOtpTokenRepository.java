package com.uav.platform.modules.auth.repository;

import com.uav.platform.modules.auth.entity.AuthOtpToken;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuthOtpTokenRepository
        extends JpaRepository<AuthOtpToken, Long>, JpaSpecificationExecutor<AuthOtpToken> {

    Optional<AuthOtpToken> findByChallengeToken(String challengeToken);

    /**
     * Row-locked read for code checks: concurrent guesses against one challenge are serialized, so
     * the attempts counter and the single-use consumption cannot race.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from AuthOtpToken t where t.challengeToken = :challengeToken")
    Optional<AuthOtpToken> findByChallengeTokenForUpdate(
            @Param("challengeToken") String challengeToken);

    Optional<AuthOtpToken>
            findFirstByEmailIgnoreCaseAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                    String email, String purpose);

    List<AuthOtpToken> findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(
            String email, String purpose);
}
