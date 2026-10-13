package com.uav.platform.modules.billing.config.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record UpdateQuotaRequest(
    @NotBlank String planCode,
    @Positive Double flightHoursLimit
) {}
