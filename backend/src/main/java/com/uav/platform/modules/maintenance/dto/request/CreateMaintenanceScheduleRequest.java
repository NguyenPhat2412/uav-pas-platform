package com.uav.platform.modules.maintenance.dto.request;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

@io.swagger.v3.oas.annotations.media.Schema(name = "CreateSchedule")
public record CreateMaintenanceScheduleRequest(
        @NotNull @Positive Long uavId,
        @NotBlank @Size(max = 160) String title,
        @NotNull @Min(1) @Max(3650) Integer intervalDays,
        @NotNull LocalDate nextDueDate) {}
