package com.uav.platform.specification;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.Uav;
import com.uav.platform.enums.*;
import com.uav.platform.enums.UavStatus;

import java.util.Collection;
import java.util.Locale;

/**
 * HibernateSpecification Factory for Uav entity according to Clean Architecture and DDD.
 */
public final class UavSpecifications {

    private UavSpecifications() {}

    /**
     * Case-insensitive keyword search across model, serialNumber, and manufacturer.
     */
    public static HibernateSpecification<Uav> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("model")), pattern),
                    cb.like(cb.lower(root.get("serialNumber")), pattern),
                    cb.like(cb.lower(root.get("manufacturer")), pattern));
        };
    }

    /**
     * Exact match on UavStatus.
     */
    public static HibernateSpecification<Uav> hasStatus(UavStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    /**
     * Filter by a collection of allowed UavStatuses.
     */
    public static HibernateSpecification<Uav> hasStatusIn(Collection<UavStatus> statuses) {
        return (root, query, cb) ->
                (statuses == null || statuses.isEmpty()) ? null : root.get("status").in(statuses);
    }

    /**
     * Filter UAVs assigned to a specific station ID.
     */
    public static HibernateSpecification<Uav> belongsToStation(Long stationId) {
        return (root, query, cb) ->
                stationId == null ? null : cb.equal(root.get("station").get("id"), stationId);
    }

    /**
     * Filter UAVs matching a specific model name.
     */
    public static HibernateSpecification<Uav> hasModel(String model) {
        return (root, query, cb) ->
                (model == null || model.isBlank())
                        ? null
                        : cb.equal(root.get("model"), model.trim());
    }

    /**
     * Filter by permitted UAV IDs (data scoping).
     */
    public static HibernateSpecification<Uav> idIn(Collection<Long> ids) {
        return (root, query, cb) -> {
            if (ids == null || ids.isEmpty()) {
                return cb.disjunction();
            }
            return root.get("id").in(ids);
        };
    }
}
