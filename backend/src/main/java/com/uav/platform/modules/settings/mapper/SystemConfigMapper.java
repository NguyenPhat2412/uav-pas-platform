package com.uav.platform.modules.settings.mapper;

import com.uav.platform.modules.settings.dto.response.SystemConfigurationHistoryResponse;
import com.uav.platform.modules.settings.dto.response.SystemConfigurationResponse;
import com.uav.platform.modules.settings.entity.SystemConfiguration;
import com.uav.platform.modules.settings.entity.SystemConfigurationHistory;
import com.uav.platform.modules.settings.enums.SettingValueType;
import com.uav.platform.modules.settings.service.impl.SystemConfigurationOperations;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface SystemConfigMapper {

    default SystemConfigurationResponse toResponse(SystemConfiguration c) {
        if (c == null) return null;
        SettingValueType type = SystemConfigurationOperations.typeOf(c);
        return new SystemConfigurationResponse(
                c.getId(),
                c.getConfigKey(),
                c.getConfigValue(),
                c.getCategory(),
                c.getDescription(),
                c.getUpdatedAt(),
                c.getUpdatedBy(),
                type.name(),
                strip(SystemConfigurationOperations.minOf(c)),
                strip(SystemConfigurationOperations.maxOf(c)),
                SystemConfigurationOperations.allowedValues(c),
                SystemConfigurationOperations.patternOf(c),
                c.isPublicSetting(),
                SystemConfigurationOperations.emptyAllowed(c));
    }

    private static java.math.BigDecimal strip(java.math.BigDecimal value) {
        return value == null
                ? null
                : new java.math.BigDecimal(value.stripTrailingZeros().toPlainString());
    }

    SystemConfigurationHistoryResponse toHistoryResponse(SystemConfigurationHistory h);
}
