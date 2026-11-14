package com.uav.platform.dto.request.billing;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Admin update payload for VietQR / NAPAS 247 receiving account and VAT rate. */
public record PaymentGatewayConfigUpdateRequest(
        @NotNull @Size(max = 12) String bankBin,
        @NotNull @Size(max = 120) String bankName,
        @NotNull @Size(max = 32) String accountNumber,
        @NotNull @Size(max = 120) String accountName,
        @NotNull @DecimalMin("0.0") @DecimalMax("1.0") BigDecimal vatRate) {}
