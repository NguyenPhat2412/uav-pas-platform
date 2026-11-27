package com.uav.platform.dto.response;

import com.uav.platform.enums.*;

import java.time.LocalDateTime;

public record EquipmentResponse(
        Long id,
        String name,
        EquipmentType type,
        String serialNumber,
        int quantity,
        int availableQuantity,
        int reservedQuantity,
        EquipmentStatus status,
        Long stationId,
        String stationName,
        LocalDateTime createdAt) {}
