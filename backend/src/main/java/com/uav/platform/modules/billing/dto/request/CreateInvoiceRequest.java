package com.uav.platform.modules.billing.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CreateInvoiceRequest(
        @NotNull Long userId,
        Long missionId,
        Long planId,
        @NotNull @Positive BigDecimal amount,
        String notes) {}
