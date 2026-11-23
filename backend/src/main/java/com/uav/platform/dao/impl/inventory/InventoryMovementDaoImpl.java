package com.uav.platform.dao.impl.inventory;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.inventory.IInventoryMovementDao;
import com.uav.platform.entity.inventory.InventoryMovement;
import com.uav.platform.enums.inventory.*;

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
