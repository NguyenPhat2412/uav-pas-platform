package com.uav.platform.specification.inventory;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.inventory.EquipmentStatus;
import com.uav.platform.enums.inventory.EquipmentType;

import java.util.Collection;
import java.util.Locale;

/**
 * HibernateSpecification Factory for Equipment entity according to Clean Architecture and DDD.
 */
public final class EquipmentSpecifications {

    private EquipmentSpecifications() {}

    /**
     * Case-insensitive keyword search across equipment name and serialNumber.
     */
    public static HibernateSpecification<Equipment> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("serialNumber"), "")), pattern));
        };
    }

    /**
     * Exact match on EquipmentType.
     */
    public static HibernateSpecification<Equipment> hasType(EquipmentType type) {
        return (root, query, cb) -> type == null ? null : cb.equal(root.get("type"), type);
    }

    /**
     * Exact match on EquipmentStatus.
     */
    public static HibernateSpecification<Equipment> hasStatus(EquipmentStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    /** Select stock that contributes to dashboard totals. */
    public static HibernateSpecification<Equipment> isActive() {
        return (root, query, cb) -> cb.notEqual(root.get("status"), EquipmentStatus.INACTIVE);
    }

    /**
     * Filter equipment belonging to a specific station ID.
     */
    public static HibernateSpecification<Equipment> belongsToStation(Long stationId) {
        return (root, query, cb) ->
                stationId == null ? null : cb.equal(root.get("station").get("id"), stationId);
    }

    /**
     * Filter by permitted equipment IDs (data scoping).
     */
    public static HibernateSpecification<Equipment> idIn(Collection<Long> ids) {
        return (root, query, cb) -> {
            if (ids == null || ids.isEmpty()) {
                return cb.disjunction();
            }
            return root.get("id").in(ids);
        };
    }
}
