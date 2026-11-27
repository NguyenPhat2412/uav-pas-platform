package com.uav.platform.dao.impl;

import com.uav.platform.dao.IInvalidatedTokenDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.InvalidatedToken;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Repository
public class InvalidatedTokenDaoImpl extends HibernateGenericDao<Long, InvalidatedToken>
        implements IInvalidatedTokenDao {

    private static final Logger logger = LoggerFactory.getLogger(InvalidatedTokenDaoImpl.class);

    public InvalidatedTokenDaoImpl(final EntityManager entityManager) {
        super(InvalidatedToken.class, entityManager);
    }

    @Override
    public boolean existsByTokenId(String tokenId) {
        return !hql("select 1 from InvalidatedToken e where e.tokenId = :tokenId", Integer.class)
                .setParameter("tokenId", tokenId)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    @Transactional
    public int deleteByExpiryTimeBefore(Instant now) {
        return hqlMutation("delete from InvalidatedToken e where e.expiryTime < :now")
                .setParameter("now", now)
                .executeUpdate();
    }
}
