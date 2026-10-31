package com.uav.platform.dto.request.maintenance;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

@io.swagger.v3.oas.annotations.media.Schema(name = "Materials")
public record UpdateRepairMaterialsRequest(
        @NotNull @PositiveOrZero Long expectedVersion,
        @NotNull @Size(max = 100) List<@NotNull @Valid RepairMaterialRequest> items) {}
