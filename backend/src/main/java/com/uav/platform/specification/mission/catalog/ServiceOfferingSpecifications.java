package com.uav.platform.specification.mission.catalog;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.mission.ServiceOffering;

/** Predicates for the UAV service catalog. */
public final class ServiceOfferingSpecifications {
    private ServiceOfferingSpecifications() {}

    public static HibernateSpecification<ServiceOffering> isActive() {
        return (root, query, cb) -> cb.isTrue(root.get("active"));
    }
}
