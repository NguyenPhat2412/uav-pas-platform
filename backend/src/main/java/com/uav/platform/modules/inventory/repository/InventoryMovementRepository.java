package com.uav.platform.modules.inventory.repository;

import com.uav.platform.modules.inventory.entity.InventoryMovement;
import com.uav.platform.modules.inventory.enums.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface InventoryMovementRepository
        extends JpaRepository<InventoryMovement, Long>,
                JpaSpecificationExecutor<InventoryMovement> {
    Optional<InventoryMovement> findByRequestId(String requestId);
}
