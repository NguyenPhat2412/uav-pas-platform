package com.uav.platform.dto.response.marketplace.escrow;

import com.uav.platform.enums.marketplace.PayoutStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProviderPayoutResponse(
        Long id,
        String code,
        Long providerId,
        String providerDisplayName,
        BigDecimal amountVnd,
        String bankName,
        String bankAccountNumber,
        String bankAccountHolder,
        PayoutStatus status,
        String providerNote,
        String adminNote,
        String bankTransferRef,
        String processedBy,
        LocalDateTime processedAt,
        LocalDateTime createdAt) {}
