package com.uav.platform.modules.inventory.specification;

import com.uav.platform.modules.inventory.entity.InventoryMovement;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.inventory.enums.MovementType;

import org.springframework.data.jpa.domain.Specification;

/**
 * Specification Factory for InventoryMovement entity according to Clean Architecture and DDD.
 */
public final class InventoryMovementSpecifications {

    private InventoryMovementSpecifications() {}

    /**
     * Filter movements for a specific equipment ID.
     */
    public static Specification<InventoryMovement> belongsToEquipment(Long equipmentId) {
        return (root, query, cb) ->
                equipmentId == null ? null : cb.equal(root.get("equipment").get("id"), equipmentId);
    }

    /**
     * Exact match on MovementType.
     */
    public static Specification<InventoryMovement> hasMovementType(MovementType type) {
        return (root, query, cb) -> type == null ? null : cb.equal(root.get("type"), type);
    }

    /**
     * Filter movements performed by a specific actor.
     */
    public static Specification<InventoryMovement> hasActor(String actor) {
        return (root, query, cb) ->
                (actor == null || actor.isBlank())
                        ? null
                        : cb.equal(root.get("actor"), actor.trim());
    }
}
