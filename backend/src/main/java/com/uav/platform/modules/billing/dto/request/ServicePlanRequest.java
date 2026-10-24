package com.uav.platform.modules.billing.dto.request;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/** New plan. The code is the stable key quotas and invoices reference, so only creation sets it. */
public record ServicePlanRequest(
        @NotBlank @Pattern(regexp = "[A-Z0-9_]{2,40}") String code,
        @NotBlank @Size(max = 120) String name,
        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2) BigDecimal price,
        @NotBlank @Pattern(regexp = "MONTHLY|YEARLY") String billingCycle,
        @NotNull @DecimalMin("1") @DecimalMax("10000") Double maxMonthlyFlightHours,
        @NotNull @Min(1) @Max(100) Integer maxConcurrentUavs,
        @NotNull Boolean allowSarAi,
        @Size(max = 500) String description) {}
