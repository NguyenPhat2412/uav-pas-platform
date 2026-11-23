package com.uav.platform.specification.uav;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.uav.UavStatusHistory;
import com.uav.platform.enums.uav.*;
import com.uav.platform.enums.uav.UavStatus;

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
