package com.uav.platform.modules.inventory.mapper;

import com.uav.platform.modules.inventory.dto.response.InventoryMovementResponse;
import com.uav.platform.modules.inventory.entity.InventoryMovement;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface InventoryMovementMapper {

    @Mapping(target = "equipmentId", source = "equipment.id")
    @Mapping(target = "equipmentName", source = "equipment.name")
    @Mapping(target = "fromStationId", source = "fromStation.id")
    @Mapping(target = "toStationId", source = "toStation.id")
    InventoryMovementResponse toResponse(InventoryMovement movement);
}
