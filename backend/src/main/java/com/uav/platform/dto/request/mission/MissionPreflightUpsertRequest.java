package com.uav.platform.dto.request.mission;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record MissionPreflightUpsertRequest(
        boolean airframeAndPropellersSafe,
        boolean batteryHealthy,
        boolean gnssRtkLocked,
        boolean weatherWithinLimits,
        boolean airspaceAndPermitCleared,
        @Min(value = 0, message = "Mức pin đo được phải từ 0% đến 100%.")
                @Max(value = 100, message = "Mức pin đo được phải từ 0% đến 100%.")
                Integer measuredBatteryPct,
        @Min(value = 0, message = "Số vệ tinh GNSS không hợp lệ.")
                @Max(value = 64, message = "Số vệ tinh GNSS tối đa 64.")
                Integer satelliteCount,
        @DecimalMin(value = "0.0", message = "Tốc độ gió đo được không hợp lệ.")
                @DecimalMax(value = "60.0", message = "Tốc độ gió đo được tối đa 60 m/s.")
                Double measuredWindMs,
        @Size(max = 1000, message = "Ghi chú tiền bay tối đa 1.000 ký tự.") String notes) {}
