package com.uav.platform.modules.sar.dto.request;

import jakarta.validation.constraints.*;

/** One detection as reported by the inference worker. Box values are percentages of the analysed frame. */
public record AiDetectionResultRequest(
        @NotBlank @Size(max = 60) String label,
        @NotNull @DecimalMin("0") @DecimalMax("1") Double confidence,
        @NotNull @DecimalMin("0") @DecimalMax("100") Double boxTop,
        @NotNull @DecimalMin("0") @DecimalMax("100") Double boxLeft,
        @NotNull @DecimalMin("0") @DecimalMax("100") Double boxWidth,
        @NotNull @DecimalMin("0") @DecimalMax("100") Double boxHeight,
        @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @Size(max = 40) String trackingId) {}
