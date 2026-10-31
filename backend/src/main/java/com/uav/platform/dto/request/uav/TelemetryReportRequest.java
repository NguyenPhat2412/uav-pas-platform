package com.uav.platform.dto.request.uav;

import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

/** A telemetry sample as sent by a ground station. missionId is optional and must hold this UAV when given. */
public record TelemetryReportRequest(
        @NotNull LocalDateTime recordedAt,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @DecimalMin("-100") @DecimalMax("10000") Double altitudeAglMeters,
        @DecimalMin("0") @DecimalMax("150") Double groundSpeedMs,
        @DecimalMin("0") @DecimalMax("360") Double headingDeg,
        @Min(0) @Max(100) Integer batteryPct,
        @Pattern(regexp = "NONE|SINGLE|FLOAT|FIXED") String rtkStatus,
        @Min(0) @Max(200) Integer satellites,
        Long missionId) {}
