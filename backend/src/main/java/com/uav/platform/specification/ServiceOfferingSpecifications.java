package com.uav.platform.specification;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.ServiceOffering;

/** Predicates for the UAV service catalog. */
public final class ServiceOfferingSpecifications {
    private ServiceOfferingSpecifications() {}

    public static HibernateSpecification<ServiceOffering> isActive() {
        return (root, query, cb) -> cb.isTrue(root.get("active"));
    }
}
