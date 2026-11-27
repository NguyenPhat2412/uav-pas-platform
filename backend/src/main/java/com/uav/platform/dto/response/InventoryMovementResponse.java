package com.uav.platform.dto.response;

import com.uav.platform.enums.*;
import com.uav.platform.enums.MovementType;

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
