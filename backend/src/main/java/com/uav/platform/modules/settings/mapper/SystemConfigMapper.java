package com.uav.platform.modules.settings.mapper;

import com.uav.platform.modules.settings.dto.response.SystemConfigurationResponse;
import com.uav.platform.modules.settings.entity.SystemConfiguration;

public final class SystemConfigMapper {

    private SystemConfigMapper() {}

    public static SystemConfigurationResponse toResponse(SystemConfiguration c) {
        return new SystemConfigurationResponse(
                c.getId(),
                c.getConfigKey(),
                c.getConfigValue(),
                c.getCategory(),
                c.getDescription(),
                c.getUpdatedAt(),
                c.getUpdatedBy());
    }
}
