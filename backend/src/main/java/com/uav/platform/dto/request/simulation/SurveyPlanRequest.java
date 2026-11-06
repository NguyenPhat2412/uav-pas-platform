package com.uav.platform.dto.request.simulation;

import jakarta.validation.constraints.*;

import java.util.List;

/** A survey area ([latitude, longitude] vertices) and the camera settings that fix the line spacing. */
public record SurveyPlanRequest(
        @NotNull @Size(min = 3, max = 200)
                List<@Size(min = 2, max = 2) List<@NotNull Double>> vertices,
        @DecimalMin("10") @DecimalMax("120") Double altitudeMeters,
        @Min(0) @Max(90) Integer sideOverlapPercent,
        @DecimalMin("2") @DecimalMax("20") Double cruiseSpeedMs) {}
