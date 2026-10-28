package com.uav.platform.modules.billing.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CreateInvoiceRequest(
        @NotNull Long userId,
        Long missionId,
        Long planId,
        @NotNull @Positive BigDecimal amount,
        String notes) {

    /** VND has no minor unit: 150000 and 150000.00 are accepted, 150000.50 is not. */
    @JsonIgnore
    @AssertTrue(message = "INVOICE_AMOUNT_WHOLE_DONG_REQUIRED")
    public boolean isWholeDongAmount() {
        return amount == null || amount.stripTrailingZeros().scale() <= 0;
    }
}
