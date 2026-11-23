package com.uav.platform.dao.impl.notification;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.notification.IPushDeviceTokenDao;
import com.uav.platform.entity.notification.PushDeviceToken;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public class PushDeviceTokenDaoImpl extends HibernateGenericDao<Long, PushDeviceToken>
        implements IPushDeviceTokenDao {

    private static final Logger logger = LoggerFactory.getLogger(PushDeviceTokenDaoImpl.class);

    public PushDeviceTokenDaoImpl(final EntityManager entityManager) {
        super(PushDeviceToken.class, entityManager);
    }

    @Override
    public Optional<PushDeviceToken> findByToken(String token) {
        return hql("select e from PushDeviceToken e where e.token = :token")
                .setParameter("token", token)
                .uniqueResultOptional();
    }

    @Override
    public List<PushDeviceToken> findByUserIdAndActiveTrue(Long userId) {
        return hql("select e from PushDeviceToken e where e.user.id = :userId and e.active = true")
                .setParameter("userId", userId)
                .getResultList();
    }

    @Override
    @Transactional
    public void deleteByUserId(Long userId) {
        hqlMutation("delete from PushDeviceToken e where e.user.id = :userId")
                .setParameter("userId", userId)
                .executeUpdate();
    }
}
