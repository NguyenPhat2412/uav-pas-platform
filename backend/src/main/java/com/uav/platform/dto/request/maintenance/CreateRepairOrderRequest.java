package com.uav.platform.dto.request.maintenance;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

@io.swagger.v3.oas.annotations.media.Schema(name = "CreateOrder")
public record CreateRepairOrderRequest(
        @NotNull @Positive Long uavId,
        @Positive Long scheduleId,
        @NotBlank @Size(max = 160) String title,
        @Size(max = 2000) String description,
        @NotNull LocalDate plannedDate,
        @NotBlank @Size(max = 120) String technicianName) {}
