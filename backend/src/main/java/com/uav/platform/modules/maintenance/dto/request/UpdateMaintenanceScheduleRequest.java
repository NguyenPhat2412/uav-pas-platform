package com.uav.platform.modules.maintenance.dto.request;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

@io.swagger.v3.oas.annotations.media.Schema(name = "UpdateSchedule")
public record UpdateMaintenanceScheduleRequest(
        @NotNull @PositiveOrZero Long expectedVersion,
        @NotBlank @Size(max = 160) String title,
        @NotNull @Min(1) @Max(3650) Integer intervalDays,
        @NotNull LocalDate nextDueDate,
        @NotNull Boolean active) {}
