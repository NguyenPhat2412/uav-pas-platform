package com.uav.platform.dto.request.maintenance;

import jakarta.validation.constraints.*;

@io.swagger.v3.oas.annotations.media.Schema(name = "Version")
public record RepairOrderVersionRequest(@NotNull @PositiveOrZero Long expectedVersion) {}
