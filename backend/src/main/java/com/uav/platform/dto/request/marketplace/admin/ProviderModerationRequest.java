package com.uav.platform.dto.request.marketplace.admin;

import com.uav.platform.enums.marketplace.ProviderVerificationStatus;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProviderModerationRequest(
        @NotNull ProviderVerificationStatus status,
        @Size(max = 1000) String reviewNote,
        @DecimalMin("0.0000") @DecimalMax("0.5000") BigDecimal commissionRateOverride) {}
