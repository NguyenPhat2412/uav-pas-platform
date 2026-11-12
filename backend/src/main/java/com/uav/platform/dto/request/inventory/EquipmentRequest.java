package com.uav.platform.dto.request.inventory;

import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.inventory.EquipmentType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EquipmentRequest(
        @NotBlank(message = "Nhập tên thiết bị.")
                @Size(max = 100, message = "Tên thiết bị không được vượt quá 100 ký tự.")
                String name,
        @NotNull(message = "Chọn loại thiết bị.") EquipmentType type,
        @Size(max = 100, message = "Số sê-ri không được vượt quá 100 ký tự.") String serialNumber,
        Long stationId) {}
