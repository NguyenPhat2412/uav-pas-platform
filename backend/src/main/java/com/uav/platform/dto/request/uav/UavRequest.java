package com.uav.platform.dto.request.uav;

import com.uav.platform.enums.uav.*;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UavRequest(
        @NotBlank @Size(max = 100) String model,
        @NotBlank @Size(max = 100) String serialNumber,
        @NotBlank @Size(max = 120) String manufacturer) {}
