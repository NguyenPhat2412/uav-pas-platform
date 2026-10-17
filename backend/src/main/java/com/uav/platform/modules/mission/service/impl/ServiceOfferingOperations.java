package com.uav.platform.modules.mission.service.impl;

import com.uav.platform.modules.mission.entity.ServiceOffering;

/** Internal creation rule shared by application services and initial data setup. */
public final class ServiceOfferingOperations {
    private ServiceOfferingOperations() {}

    public static ServiceOffering create(
            String code, String name, String description, int defaultDurationMinutes) {
        if (defaultDurationMinutes <= 0)
            throw new IllegalArgumentException("Default duration must be positive");
        return new ServiceOffering(code, name, description, defaultDurationMinutes);
    }
}
