package com.uav.platform.modules.auth.repository;

import com.uav.platform.modules.auth.entity.AuthOtpToken;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuthOtpTokenRepository
        extends JpaRepository<AuthOtpToken, Long>, JpaSpecificationExecutor<AuthOtpToken> {

    Optional<AuthOtpToken> findByChallengeToken(String challengeToken);

    Optional<AuthOtpToken>
            findFirstByEmailIgnoreCaseAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                    String email, String purpose);

    List<AuthOtpToken> findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(
            String email, String purpose);
}
