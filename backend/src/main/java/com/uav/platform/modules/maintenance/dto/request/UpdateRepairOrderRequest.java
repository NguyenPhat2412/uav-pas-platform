package com.uav.platform.modules.maintenance.dto.request;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

@io.swagger.v3.oas.annotations.media.Schema(name = "UpdateOrder")
public record UpdateRepairOrderRequest(
        @NotNull @PositiveOrZero Long expectedVersion,
        @NotBlank @Size(max = 160) String title,
        @Size(max = 2000) String description,
        @NotNull LocalDate plannedDate,
        @NotBlank @Size(max = 120) String technicianName) {}
