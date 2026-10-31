package com.uav.platform.mapper.settings;

import com.uav.platform.dto.response.settings.SystemConfigurationHistoryResponse;
import com.uav.platform.dto.response.settings.SystemConfigurationResponse;
import com.uav.platform.entity.settings.SystemConfiguration;
import com.uav.platform.entity.settings.SystemConfigurationHistory;
import com.uav.platform.enums.settings.SettingValueType;
import com.uav.platform.service.impl.settings.SystemConfigurationOperations;

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
