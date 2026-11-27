package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.InventoryMovement;
import com.uav.platform.enums.*;

import java.util.Optional;

public interface IInventoryMovementDao extends IGenericDao<Long, InventoryMovement> {
    Optional<InventoryMovement> findByRequestId(String requestId);
}
