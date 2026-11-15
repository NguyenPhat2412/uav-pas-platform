package com.uav.platform.dto.request.marketplace.escrow;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record PayoutCreateRequest(
        @NotNull @DecimalMin(value = "50000", message = "Số tiền rút tối thiểu là 50.000 VNĐ.")
                BigDecimal amountVnd,
        @Size(max = 500) String providerNote) {}
