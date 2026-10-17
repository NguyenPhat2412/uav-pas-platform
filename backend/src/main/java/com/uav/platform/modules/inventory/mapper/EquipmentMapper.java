package com.uav.platform.modules.inventory.mapper;

import com.uav.platform.modules.inventory.dto.response.EquipmentResponse;
import com.uav.platform.modules.inventory.entity.Equipment;

public final class EquipmentMapper {
    private EquipmentMapper() {}

    public static EquipmentResponse toResponse(Equipment e) {
        return new EquipmentResponse(
                e.getId(),
                e.getName(),
                e.getType(),
                e.getSerialNumber(),
                e.getQuantity(),
                e.getAvailableQuantity(),
                e.getReservedQuantity(),
                e.getStatus(),
                e.getStation() == null ? null : e.getStation().getId(),
                e.getStation() == null ? null : e.getStation().getName(),
                e.getCreatedAt());
    }
}
