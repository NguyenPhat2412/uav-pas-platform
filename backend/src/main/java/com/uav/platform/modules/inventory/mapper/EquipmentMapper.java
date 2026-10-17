package com.uav.platform.modules.inventory.mapper;

import com.uav.platform.modules.inventory.dto.response.EquipmentResponse;
import com.uav.platform.modules.inventory.entity.Equipment;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface EquipmentMapper {

    @Mapping(target = "stationId", source = "station.id")
    @Mapping(target = "stationName", source = "station.name")
    EquipmentResponse toResponse(Equipment e);
}
