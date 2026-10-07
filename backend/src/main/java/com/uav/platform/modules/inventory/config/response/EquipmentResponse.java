package com.uav.platform.modules.inventory.config.response;

import com.uav.platform.modules.inventory.common.*;

import java.time.LocalDateTime;

public record EquipmentResponse(Long id, String name, EquipmentType type, String serialNumber,
                                int quantity, int availableQuantity, int reservedQuantity,
                                EquipmentStatus status, Long stationId, String stationName,
                                LocalDateTime createdAt) { }
