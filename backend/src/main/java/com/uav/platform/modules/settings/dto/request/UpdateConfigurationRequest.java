package com.uav.platform.modules.settings.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateConfigurationRequest(@NotBlank String configValue, String description) {}
