package com.uav.platform.modules.uav.config.request;


import com.uav.platform.modules.uav.common.*;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UavRequest(@NotBlank @Size(max = 100) String model,
                         @NotBlank @Size(max = 100) String serialNumber,
                         @NotBlank @Size(max = 120) String manufacturer) { }
