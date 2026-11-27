package com.uav.platform.dao.impl;

import com.uav.platform.dao.IInventoryMovementDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.InventoryMovement;
import com.uav.platform.enums.*;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class InventoryMovementDaoImpl extends HibernateGenericDao<Long, InventoryMovement>
        implements IInventoryMovementDao {

    private static final Logger logger = LoggerFactory.getLogger(InventoryMovementDaoImpl.class);

    public InventoryMovementDaoImpl(final EntityManager entityManager) {
        super(InventoryMovement.class, entityManager);
    }

    @Override
    public Optional<InventoryMovement> findByRequestId(String requestId) {
        return hql("select e from InventoryMovement e where e.requestId = :requestId")
                .setParameter("requestId", requestId)
                .uniqueResultOptional();
    }
}
