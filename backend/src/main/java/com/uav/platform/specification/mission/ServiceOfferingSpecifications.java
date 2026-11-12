package com.uav.platform.specification.mission;

import com.uav.platform.entity.mission.ServiceOffering;

import org.springframework.data.jpa.domain.Specification;

/** Predicates for the UAV service catalog. */
public final class ServiceOfferingSpecifications {
    private ServiceOfferingSpecifications() {}

    public static Specification<ServiceOffering> isActive() {
        return (root, query, cb) -> cb.isTrue(root.get("active"));
    }
}
