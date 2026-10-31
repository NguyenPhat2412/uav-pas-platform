package com.uav.platform.service.impl.mission;

import com.uav.platform.entity.mission.ServiceOffering;

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
