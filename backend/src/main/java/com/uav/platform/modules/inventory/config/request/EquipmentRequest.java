package com.uav.platform.modules.inventory.config.request;


import com.uav.platform.modules.inventory.common.*;

import com.uav.platform.modules.inventory.common.EquipmentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EquipmentRequest(@NotBlank String name, @NotNull EquipmentType type, String serialNumber, Long stationId) { }
