package com.uav.platform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SwitchLocaleRequest(
        @NotBlank @Size(max = 10) String locale, @Size(max = 60) String namespace) {}
