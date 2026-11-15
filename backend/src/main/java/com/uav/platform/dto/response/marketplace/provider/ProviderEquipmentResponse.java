package com.uav.platform.dto.response.marketplace.provider;

import com.uav.platform.enums.inventory.EquipmentStatus;
import com.uav.platform.enums.inventory.EquipmentType;

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
