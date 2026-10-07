package com.uav.platform.modules.uav.specification;


import com.uav.platform.modules.uav.common.*;

import com.uav.platform.modules.uav.common.UavStatus;
import com.uav.platform.modules.uav.entity.UavStatusHistory;
import org.springframework.data.jpa.domain.Specification;

/**
 * Specification Factory for UavStatusHistory entity according to Clean Architecture and DDD.
 */
public final class UavStatusHistorySpecifications {

    private UavStatusHistorySpecifications() {}

    /**
     * Filter history records for a specific UAV ID.
     */
    public static Specification<UavStatusHistory> belongsToUav(Long uavId) {
        return (root, query, cb) -> uavId == null ? null : cb.equal(root.get("uav").get("id"), uavId);
    }

    /**
     * Filter history records by the resulting toStatus.
     */
    public static Specification<UavStatusHistory> hasStatus(UavStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("toStatus"), status);
    }
}
