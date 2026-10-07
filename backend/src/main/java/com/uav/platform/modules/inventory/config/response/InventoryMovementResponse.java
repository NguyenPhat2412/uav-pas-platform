package com.uav.platform.modules.inventory.config.response;

import com.uav.platform.modules.inventory.common.*;

import com.uav.platform.modules.inventory.common.MovementType;

import java.time.LocalDateTime;

public record InventoryMovementResponse(Long id, Long equipmentId, String equipmentName, MovementType type,
                                        int quantity, Long fromStationId, Long toStationId, String actor,
                                        String note, LocalDateTime createdAt) { }
