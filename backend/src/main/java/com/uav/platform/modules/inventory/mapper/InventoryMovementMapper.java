package com.uav.platform.modules.inventory.mapper;

import com.uav.platform.modules.inventory.config.response.InventoryMovementResponse;
import com.uav.platform.modules.inventory.entity.InventoryMovement;

public final class InventoryMovementMapper {
    private InventoryMovementMapper() {}
    public static InventoryMovementResponse toResponse(InventoryMovement movement) {
        return new InventoryMovementResponse(movement.getId(), movement.getEquipment().getId(), movement.getEquipment().getName(),
                movement.getType(), movement.getQuantity(), movement.getFromStation() == null ? null : movement.getFromStation().getId(),
                movement.getToStation() == null ? null : movement.getToStation().getId(), movement.getActor(), movement.getNote(), movement.getCreatedAt());
    }
}
