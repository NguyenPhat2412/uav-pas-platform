package com.uav.platform.mapper.inventory;

import com.uav.platform.dto.response.inventory.EquipmentResponse;
import com.uav.platform.entity.inventory.Equipment;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface EquipmentMapper {

    @Mapping(target = "stationId", source = "station.id")
    @Mapping(target = "stationName", source = "station.name")
    EquipmentResponse toResponse(Equipment e);
}
