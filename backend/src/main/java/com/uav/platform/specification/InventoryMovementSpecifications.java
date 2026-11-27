package com.uav.platform.specification;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.InventoryMovement;
import com.uav.platform.enums.*;
import com.uav.platform.enums.MovementType;

/**
 * HibernateSpecification Factory for InventoryMovement entity according to Clean Architecture and DDD.
 */
public final class InventoryMovementSpecifications {

    private InventoryMovementSpecifications() {}

    /**
     * Filter movements for a specific equipment ID.
     */
    public static HibernateSpecification<InventoryMovement> belongsToEquipment(Long equipmentId) {
        return (root, query, cb) ->
                equipmentId == null ? null : cb.equal(root.get("equipment").get("id"), equipmentId);
    }

    /**
     * Exact match on MovementType.
     */
    public static HibernateSpecification<InventoryMovement> hasMovementType(MovementType type) {
        return (root, query, cb) -> type == null ? null : cb.equal(root.get("type"), type);
    }

    /**
     * Filter movements performed by a specific actor.
     */
    public static HibernateSpecification<InventoryMovement> hasActor(String actor) {
        return (root, query, cb) ->
                (actor == null || actor.isBlank())
                        ? null
                        : cb.equal(root.get("actor"), actor.trim());
    }
}
