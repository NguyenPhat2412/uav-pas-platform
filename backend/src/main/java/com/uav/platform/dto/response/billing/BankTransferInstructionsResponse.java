package com.uav.platform.dto.response.billing;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Everything a customer needs to pay one invoice by NAPAS 247 transfer. The invoice amount is VAT inclusive;
 * subtotal and vat are derived from it with the configured rate.
 */
public record BankTransferInstructionsResponse(
        Long invoiceId,
        String invoiceCode,
        String status,
        String bankBin,
        String bankName,
        String accountNumber,
        String accountName,
        String transferContent,
        String qrPayload,
        BigDecimal subtotal,
        BigDecimal vatRate,
        BigDecimal vat,
        BigDecimal total,
        String itemName,
        Double flightHours,
        LocalDateTime dueDate,
        LocalDateTime issuedAt) {}
