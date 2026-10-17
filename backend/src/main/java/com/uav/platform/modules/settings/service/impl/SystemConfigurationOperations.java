package com.uav.platform.modules.settings.service.impl;

import com.uav.platform.modules.settings.entity.SystemConfiguration;

/** Internal creation rules shared by application services and setup callers. */
public final class SystemConfigurationOperations {
    private SystemConfigurationOperations() {}

    public static SystemConfiguration create(
            String configKey,
            String configValue,
            String category,
            String description,
            String updatedBy) {
        SystemConfiguration entity = new SystemConfiguration();
        entity.setConfigKey(configKey);
        entity.setConfigValue(configValue);
        entity.setCategory(category != null ? category : "OPERATIONS");
        entity.setDescription(description);
        entity.setUpdatedBy(updatedBy);
        return entity;
    }
}
