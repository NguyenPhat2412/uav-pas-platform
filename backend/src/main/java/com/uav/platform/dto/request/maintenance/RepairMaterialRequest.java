package com.uav.platform.dto.request.maintenance;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

@io.swagger.v3.oas.annotations.media.Schema(name = "Material")
public record RepairMaterialRequest(
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Size(max = 30) String unit,
        @NotNull
                @DecimalMin(value = "0", inclusive = false)
                @DecimalMax("10000")
                @Digits(integer = 5, fraction = 3)
                BigDecimal quantity,
        @NotNull @DecimalMin("0") @DecimalMax("1000000000") @Digits(integer = 10, fraction = 0)
                BigDecimal unitPrice) {}
