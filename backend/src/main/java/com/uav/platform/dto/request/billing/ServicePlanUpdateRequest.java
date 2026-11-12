package com.uav.platform.dto.request.billing;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/** Editable plan terms. Existing quotas keep their own limits until an admin reassigns the plan. */
public record ServicePlanUpdateRequest(
        @NotBlank @Size(max = 120) String name,
        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2) BigDecimal price,
        @NotBlank @Pattern(regexp = "MONTHLY|YEARLY") String billingCycle,
        @NotNull @DecimalMin("1") @DecimalMax("10000") Double maxMonthlyFlightHours,
        @NotNull @Min(1) @Max(100) Integer maxConcurrentUavs,
        @NotNull Boolean allowSarAi,
        @Size(max = 500) String description) {}
