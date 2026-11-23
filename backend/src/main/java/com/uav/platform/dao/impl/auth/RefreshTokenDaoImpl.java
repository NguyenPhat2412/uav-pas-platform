package com.uav.platform.dao.impl.auth;

import com.uav.platform.dao.auth.IRefreshTokenDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.auth.RefreshToken;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.auth.ClientKind;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public class RefreshTokenDaoImpl extends HibernateGenericDao<Long, RefreshToken>
        implements IRefreshTokenDao {

    private static final Logger logger = LoggerFactory.getLogger(RefreshTokenDaoImpl.class);

    public RefreshTokenDaoImpl(final EntityManager entityManager) {
        super(RefreshToken.class, entityManager);
    }

    @Override
    public Optional<RefreshToken> findByToken(String token) {
        return hql("select e from RefreshToken e where e.token = :token")
                .setParameter("token", token)
                .uniqueResultOptional();
    }

    @Override
    public Optional<Long> findUserIdByToken(String token) {
        return hql("select r.user.id from RefreshToken r where r.token = :token", Long.class)
                .setParameter("token", token)
                .uniqueResultOptional();
    }

    @Override
    public Optional<RefreshToken> findByTokenForUpdate(String token) {
        return hql("select r from RefreshToken r where r.token = :token", RefreshToken.class)
                .setParameter("token", token)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public List<RefreshToken> findByUser(AppUser user) {
        return hql("select e from RefreshToken e where e.user = :user")
                .setParameter("user", user)
                .getResultList();
    }

    @Override
    @Transactional
    public int deleteByUser(AppUser user) {
        return hqlMutation("DELETE FROM RefreshToken r WHERE r.user = :user")
                .setParameter("user", user)
                .executeUpdate();
    }

    @Override
    @Transactional
    public int deleteByUserAndClient(AppUser user, ClientKind client) {
        return hqlMutation("DELETE FROM RefreshToken r WHERE r.user = :user AND r.client = :client")
                .setParameter("user", user)
                .setParameter("client", client)
                .executeUpdate();
    }

    @Override
    public List<RefreshToken> findByUserIdIn(Collection<Long> userIds) {
        if (isEmpty(userIds)) return List.of();
        return hql("select r from RefreshToken r where r.user.id in :userIds", RefreshToken.class)
                .setParameter("userIds", userIds)
                .getResultList();
    }

    @Override
    @Transactional
    public int revokeByUserId(Long userId) {
        return hqlMutation(
                        "update RefreshToken r set r.revoked = true"
                                + " where r.user.id = :userId and r.revoked = false")
                .setParameter("userId", userId)
                .executeUpdate();
    }

    @Override
    @Transactional
    public int revokeAllExceptUserId(Long excludedUserId) {
        return hqlMutation(
                        "update RefreshToken r set r.revoked = true"
                                + " where r.user.id <> :excludedUserId and r.revoked = false")
                .setParameter("excludedUserId", excludedUserId)
                .executeUpdate();
    }

    @Override
    @Transactional
    public int deleteByExpiryDateBefore(Instant now) {
        return hqlMutation("delete from RefreshToken e where e.expiryDate < :now")
                .setParameter("now", now)
                .executeUpdate();
    }
}
