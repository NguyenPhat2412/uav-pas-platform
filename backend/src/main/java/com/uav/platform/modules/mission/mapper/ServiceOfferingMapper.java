package com.uav.platform.modules.mission.mapper;

import com.uav.platform.modules.mission.dto.response.ServiceOfferingResponse;
import com.uav.platform.modules.mission.entity.ServiceOffering;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ServiceOfferingMapper {

    ServiceOfferingResponse toResponse(ServiceOffering service);
}
