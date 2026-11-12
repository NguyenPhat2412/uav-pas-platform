package com.uav.platform.dto.request.settings;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Empty values are allowed only where the setting's rule permits (env fallback or hidden item). */
public record UpdateConfigurationRequest(
        @NotNull @Size(max = 500) String configValue, @Size(max = 255) String description) {}
