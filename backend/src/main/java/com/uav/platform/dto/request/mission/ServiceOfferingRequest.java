package com.uav.platform.dto.request.mission;

import com.uav.platform.enums.mission.*;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@io.swagger.v3.oas.annotations.media.Schema(name = "UavServiceRequest")
public record ServiceOfferingRequest(
        @NotBlank String code,
        @NotBlank String name,
        String description,
        @Min(1) int defaultDurationMinutes) {}
