package com.uav.platform.dto.request.marketplace.provider;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProviderUavCreateRequest(
        @NotBlank(message = "Nhập dòng máy bay UAV.") @Size(max = 100) String model,
        @NotBlank(message = "Nhập số serial máy bay.") @Size(max = 100) String serialNumber,
        @NotBlank(message = "Nhập hãng sản xuất.") @Size(max = 120) String manufacturer) {}
