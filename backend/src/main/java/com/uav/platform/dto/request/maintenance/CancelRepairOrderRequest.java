package com.uav.platform.dto.request.maintenance;

import jakarta.validation.constraints.*;

@io.swagger.v3.oas.annotations.media.Schema(name = "Cancel")
public record CancelRepairOrderRequest(
        @NotNull @PositiveOrZero Long expectedVersion, @NotBlank @Size(max = 1000) String reason) {}
