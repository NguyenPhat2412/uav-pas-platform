package com.uav.platform.service.impl.role;

import com.uav.platform.entity.role.*;

/** Internal service implementation rules; persistence entities contain data only. */
public final class RoleTemplateOperations {
    private RoleTemplateOperations() {}

    public static void initializeDefaults(RoleTemplate value) {
        value.setDefaultsInitialized(true);
    }
}
