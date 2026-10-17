package com.uav.platform.modules.settings.mapper;

import com.uav.platform.modules.settings.dto.response.SystemConfigurationResponse;
import com.uav.platform.modules.settings.entity.SystemConfiguration;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface SystemConfigMapper {

    SystemConfigurationResponse toResponse(SystemConfiguration c);
}
