package com.uav.platform.dto.response.inventory;

import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.inventory.MovementType;

import java.time.LocalDateTime;

public record InventoryMovementResponse(
        Long id,
        Long equipmentId,
        String equipmentName,
        MovementType type,
        int quantity,
        Long fromStationId,
        Long toStationId,
        String actor,
        String note,
        LocalDateTime createdAt) {}
