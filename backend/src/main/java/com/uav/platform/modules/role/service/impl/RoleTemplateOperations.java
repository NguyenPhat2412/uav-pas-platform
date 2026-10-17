package com.uav.platform.modules.role.service.impl;

import com.uav.platform.modules.role.entity.*;

/** Internal service implementation rules; persistence entities contain data only. */
public final class RoleTemplateOperations {
    private RoleTemplateOperations() {}

    public static void initializeDefaults(RoleTemplate value) {
        value.setDefaultsInitialized(true);
    }
}
