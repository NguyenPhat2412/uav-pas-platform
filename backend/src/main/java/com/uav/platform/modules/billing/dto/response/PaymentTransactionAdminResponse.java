package com.uav.platform.modules.billing.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Admin view of a payment/IPN record. rawCallback has credential-like fields redacted. */
public record PaymentTransactionAdminResponse(
        Long id,
        String transactionCode,
        String gatewayName,
        BigDecimal amount,
        String status,
        String bankBin,
        String bankAccountNumber,
        Long invoiceId,
        String invoiceCode,
        String invoiceStatus,
        BigDecimal invoiceAmount,
        Long userId,
        String username,
        String customerName,
        String customerEmail,
        String rawCallback,
        LocalDateTime createdAt,
        LocalDateTime completedAt) {}
