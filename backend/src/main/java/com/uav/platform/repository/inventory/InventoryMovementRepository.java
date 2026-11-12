package com.uav.platform.repository.inventory;

import com.uav.platform.entity.inventory.InventoryMovement;
import com.uav.platform.enums.inventory.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface InventoryMovementRepository
        extends JpaRepository<InventoryMovement, Long>,
                JpaSpecificationExecutor<InventoryMovement> {
    Optional<InventoryMovement> findByRequestId(String requestId);
}
