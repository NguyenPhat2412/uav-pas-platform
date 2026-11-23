package com.uav.platform.dao.inventory;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.inventory.InventoryMovement;
import com.uav.platform.enums.inventory.*;

import java.util.Optional;

public interface IInventoryMovementDao extends IGenericDao<Long, InventoryMovement> {
    Optional<InventoryMovement> findByRequestId(String requestId);
}
