package com.uav.platform.specification;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.UavStatusHistory;
import com.uav.platform.enums.*;
import com.uav.platform.enums.UavStatus;

/**
 * HibernateSpecification Factory for UavStatusHistory entity according to Clean Architecture and DDD.
 */
public final class UavStatusHistorySpecifications {

    private UavStatusHistorySpecifications() {}

    /**
     * Filter history records for a specific UAV ID.
     */
    public static HibernateSpecification<UavStatusHistory> belongsToUav(Long uavId) {
        return (root, query, cb) ->
                uavId == null ? null : cb.equal(root.get("uav").get("id"), uavId);
    }

    /**
     * Filter history records by the resulting toStatus.
     */
    public static HibernateSpecification<UavStatusHistory> hasStatus(UavStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("toStatus"), status);
    }
}
