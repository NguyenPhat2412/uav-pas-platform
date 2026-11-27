package com.uav.platform.dto.response;

import com.uav.platform.enums.WalletTransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WalletTransactionResponse(
        Long id,
        Long invoiceId,
        Long payoutId,
        WalletTransactionType transactionType,
        BigDecimal grossAmountVnd,
        BigDecimal feeAmountVnd,
        BigDecimal netAmountVnd,
        BigDecimal balanceAfterVnd,
        String description,
        LocalDateTime createdAt) {}
