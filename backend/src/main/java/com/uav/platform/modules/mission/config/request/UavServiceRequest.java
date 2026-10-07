package com.uav.platform.modules.mission.config.request;


import com.uav.platform.modules.mission.common.*;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record UavServiceRequest(@NotBlank String code, @NotBlank String name, String description, @Min(1) int defaultDurationMinutes) {}
