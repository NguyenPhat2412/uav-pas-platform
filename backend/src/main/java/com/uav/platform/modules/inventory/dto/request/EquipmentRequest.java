package com.uav.platform.modules.inventory.dto.request;

import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.inventory.enums.EquipmentType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EquipmentRequest(
        @NotBlank String name, @NotNull EquipmentType type, String serialNumber, Long stationId) {}
