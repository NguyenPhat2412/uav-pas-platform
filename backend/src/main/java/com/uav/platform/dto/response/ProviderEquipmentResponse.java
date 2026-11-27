package com.uav.platform.dto.response;

import com.uav.platform.enums.EquipmentStatus;
import com.uav.platform.enums.EquipmentType;

import java.time.LocalDateTime;

public record ProviderEquipmentResponse(
        Long id,
        String name,
        EquipmentType type,
        String serialNumber,
        int quantity,
        int availableQuantity,
        EquipmentStatus status,
        LocalDateTime createdAt) {}
