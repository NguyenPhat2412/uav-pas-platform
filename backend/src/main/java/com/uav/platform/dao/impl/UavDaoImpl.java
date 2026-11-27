package com.uav.platform.dao.impl;

import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.Uav;
import com.uav.platform.enums.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class UavDaoImpl extends HibernateGenericDao<Long, Uav> implements IUavDao {

    private static final Logger logger = LoggerFactory.getLogger(UavDaoImpl.class);

    public UavDaoImpl(final EntityManager entityManager) {
        super(Uav.class, entityManager);
    }

    @Override
    public boolean existsBySerialNumber(String serialNumber) {
        return !hql("select 1 from Uav e where e.serialNumber = :serialNumber", Integer.class)
                .setParameter("serialNumber", serialNumber)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public List<Uav> findAllWithStation() {
        return withEntityGraph(hql("select u from Uav u", Uav.class), "station").getResultList();
    }

    @Override
    public Optional<Uav> findByIdForUpdate(Long id) {
        return hql("select u from Uav u where u.id = :id", Uav.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public List<Uav> findByProviderIdOrderByIdDesc(Long providerId) {
        return withEntityGraph(
                        hql("select e from Uav e where e.provider.id = :providerId order by e.id desc")
                                .setParameter("providerId", providerId),
                        "station")
                .getResultList();
    }
}
