package com.uav.platform.modules.mission.dto.request;

import com.uav.platform.modules.mission.enums.*;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@io.swagger.v3.oas.annotations.media.Schema(name = "UavServiceRequest")
public record ServiceOfferingRequest(
        @NotBlank String code,
        @NotBlank String name,
        String description,
        @Min(1) int defaultDurationMinutes) {}
