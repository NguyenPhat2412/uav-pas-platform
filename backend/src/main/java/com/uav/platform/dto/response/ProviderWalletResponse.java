package com.uav.platform.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record ProviderWalletResponse(
        Long providerId,
        String providerDisplayName,
        BigDecimal platformFeeRate,
        BigDecimal escrowHeldVnd,
        BigDecimal availableBalanceVnd,
        BigDecimal pendingPayoutVnd,
        BigDecimal totalEarnedVnd,
        BigDecimal totalWithdrawnVnd,
        String bankName,
        String bankAccountNumber,
        String bankAccountHolder,
        List<WalletTransactionResponse> recentTransactions,
        List<ProviderPayoutResponse> payouts) {}
