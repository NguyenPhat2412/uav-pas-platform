package com.uav.platform.dao.impl;

import com.uav.platform.dao.IAuthOtpTokenDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.AuthOtpToken;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class AuthOtpTokenDaoImpl extends HibernateGenericDao<Long, AuthOtpToken>
        implements IAuthOtpTokenDao {

    private static final Logger logger = LoggerFactory.getLogger(AuthOtpTokenDaoImpl.class);

    public AuthOtpTokenDaoImpl(final EntityManager entityManager) {
        super(AuthOtpToken.class, entityManager);
    }

    @Override
    public Optional<AuthOtpToken> findByChallengeToken(String challengeToken) {
        return hql("select e from AuthOtpToken e where e.challengeToken = :challengeToken")
                .setParameter("challengeToken", challengeToken)
                .uniqueResultOptional();
    }

    @Override
    public Optional<AuthOtpToken> findByChallengeTokenForUpdate(String challengeToken) {
        return hql(
                        "select t from AuthOtpToken t where t.challengeToken = :challengeToken",
                        AuthOtpToken.class)
                .setParameter("challengeToken", challengeToken)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public Optional<AuthOtpToken>
            findFirstByEmailIgnoreCaseAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                    String email, String purpose) {
        List<AuthOtpToken> rows =
                hql("select e from AuthOtpToken e where lower(e.email) = lower(:email) and e.purpose = :purpose and e.consumedAt is null order by e.createdAt desc")
                        .setParameter("email", email)
                        .setParameter("purpose", purpose)
                        .setMaxResults(1)
                        .getResultList();
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public List<AuthOtpToken> findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(
            String email, String purpose) {
        return hql("select e from AuthOtpToken e where lower(e.email) = lower(:email) and e.purpose = :purpose and e.consumedAt is null")
                .setParameter("email", email)
                .setParameter("purpose", purpose)
                .getResultList();
    }
}
