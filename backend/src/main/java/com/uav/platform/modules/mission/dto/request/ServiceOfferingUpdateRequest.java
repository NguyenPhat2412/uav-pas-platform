package com.uav.platform.modules.mission.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Editable fields of a service; the code is the stable key customers' missions refer to, so it never changes. */
@io.swagger.v3.oas.annotations.media.Schema(name = "UavServiceUpdateRequest")
public record ServiceOfferingUpdateRequest(
        @NotBlank @Size(max = 160) String name,
        @Size(max = 500) String description,
        @Min(1) @Max(1440) int defaultDurationMinutes) {}
