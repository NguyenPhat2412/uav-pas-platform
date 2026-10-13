package com.uav.platform.modules.settings.config.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateConfigurationRequest(
    @NotBlank String configValue,
    String description
) {}
