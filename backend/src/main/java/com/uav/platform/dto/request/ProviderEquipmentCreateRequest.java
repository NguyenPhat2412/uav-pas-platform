package com.uav.platform.dto.request;

import com.uav.platform.enums.EquipmentType;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProviderEquipmentCreateRequest(
        @NotBlank(message = "Nhập tên thiết bị / payload.") @Size(max = 100) String name,
        @NotNull EquipmentType type,
        @Size(max = 100) String serialNumber,
        @Min(1) int quantity) {}
