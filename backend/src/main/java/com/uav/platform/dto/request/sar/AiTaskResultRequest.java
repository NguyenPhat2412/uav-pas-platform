package com.uav.platform.dto.request.sar;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/** Result of one inference task, posted by the KV260 edge board or the cloud worker that ran it. */
public record AiTaskResultRequest(
        @NotNull @Pattern(regexp = "COMPLETED|FAILED") String status,
        @Min(0) @Max(600000) Integer inferenceTimeMs,
        @DecimalMin("0") @DecimalMax("1000") Double fps,
        @DecimalMin("0") @DecimalMax("100") Double dpuUtilization,
        @DecimalMin("-40") @DecimalMax("150") Double socTemperature,
        @Size(max = 500) String errorMessage,
        @Size(max = 500) List<@Valid AiDetectionResultRequest> detections) {}
