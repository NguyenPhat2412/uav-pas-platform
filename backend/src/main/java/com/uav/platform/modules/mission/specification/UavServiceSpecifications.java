package com.uav.platform.modules.mission.specification;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.entity.UavService;
import org.springframework.data.jpa.domain.Specification;

/** Predicates for the UAV service catalog. */
public final class UavServiceSpecifications {
    private UavServiceSpecifications() {}

    public static Specification<UavService> isActive() {
        return (root, query, cb) -> cb.isTrue(root.get("active"));
    }
}
