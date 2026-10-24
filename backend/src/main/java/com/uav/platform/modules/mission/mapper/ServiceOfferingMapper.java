package com.uav.platform.modules.mission.mapper;

import com.uav.platform.modules.mission.dto.response.ServiceOfferingResponse;
import com.uav.platform.modules.mission.entity.ServiceOffering;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import java.util.Arrays;
import java.util.List;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ServiceOfferingMapper {

    @Mapping(target = "sensors", expression = "java(ServiceOfferingMapper.sensors(service.getSensors()))")
    ServiceOfferingResponse toResponse(ServiceOffering service);

    static List<String> sensors(String stored) {
        return stored == null || stored.isBlank() ? List.of() : Arrays.stream(stored.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
