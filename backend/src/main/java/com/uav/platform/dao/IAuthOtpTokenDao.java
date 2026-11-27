package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.AuthOtpToken;

import java.util.List;
import java.util.Optional;

public interface IAuthOtpTokenDao extends IGenericDao<Long, AuthOtpToken> {
    Optional<AuthOtpToken> findByChallengeToken(String challengeToken);

    Optional<AuthOtpToken> findByChallengeTokenForUpdate(String challengeToken);

    Optional<AuthOtpToken>
            findFirstByEmailIgnoreCaseAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                    String email, String purpose);

    List<AuthOtpToken> findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(
            String email, String purpose);
}
