package com.uav.platform.dao.impl;

import com.uav.platform.dao.IDeviceApiKeyDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.DeviceApiKey;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class DeviceApiKeyDaoImpl extends HibernateGenericDao<Long, DeviceApiKey>
        implements IDeviceApiKeyDao {

    private static final Logger logger = LoggerFactory.getLogger(DeviceApiKeyDaoImpl.class);

    public DeviceApiKeyDaoImpl(final EntityManager entityManager) {
        super(DeviceApiKey.class, entityManager);
    }

    @Override
    public Optional<DeviceApiKey> findByKeyHash(String keyHash) {
        return hql("select e from DeviceApiKey e where e.keyHash = :keyHash")
                .setParameter("keyHash", keyHash)
                .uniqueResultOptional();
    }

    @Override
    public List<DeviceApiKey> findAllByOrderByCreatedAtDescIdDesc() {
        return hql("select e from DeviceApiKey e order by e.createdAt desc, e.id desc")
                .getResultList();
    }

    @Override
    public List<DeviceApiKey> findExpiringBetween(LocalDateTime now, LocalDateTime until) {
        return hql(
                        "select k from DeviceApiKey k where k.revokedAt is null and k.expiresAt is not null"
                                + " and k.expiresAt > :now and k.expiresAt <= :until order by k.expiresAt",
                        DeviceApiKey.class)
                .setParameter("now", now)
                .setParameter("until", until)
                .getResultList();
    }

    @Override
    @Transactional
    public int touch(Long id, LocalDateTime now, LocalDateTime threshold) {
        return hqlMutation(
                        "update DeviceApiKey k set k.lastUsedAt = :now where k.id = :id"
                                + " and (k.lastUsedAt is null or k.lastUsedAt < :threshold)")
                .setParameter("id", id)
                .setParameter("now", now)
                .setParameter("threshold", threshold)
                .executeUpdate();
    }
}
