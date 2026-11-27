package com.uav.platform.dao.impl;

import com.uav.platform.dao.IEquipmentDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.Equipment;
import com.uav.platform.enums.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class EquipmentDaoImpl extends HibernateGenericDao<Long, Equipment>
        implements IEquipmentDao {

    private static final Logger logger = LoggerFactory.getLogger(EquipmentDaoImpl.class);

    public EquipmentDaoImpl(final EntityManager entityManager) {
        super(Equipment.class, entityManager);
    }

    @Override
    public java.util.Optional<Equipment> findByIdForUpdate(Long id) {
        return hql("select e from Equipment e where e.id = :id", Equipment.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public boolean existsBySerialNumber(String serialNumber) {
        return !hql("select 1 from Equipment e where e.serialNumber = :serialNumber", Integer.class)
                .setParameter("serialNumber", serialNumber)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public List<Equipment> findAllWithStation() {
        return withEntityGraph(hql("select e from Equipment e", Equipment.class), "station")
                .getResultList();
    }

    @Override
    public List<Equipment> findByProviderIdOrderByIdDesc(Long providerId) {
        return withEntityGraph(
                        hql("select e from Equipment e where e.provider.id = :providerId order by e.id desc")
                                .setParameter("providerId", providerId),
                        "station")
                .getResultList();
    }
}
