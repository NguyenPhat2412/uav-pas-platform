package com.uav.platform.dto.record.billing;

import com.uav.platform.enums.billing.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Resolved snapshot of invoice, customer, tax profile, and settlement data for PDF rendering. */
public record InvoiceReceiptData(
        Long invoiceId,
        String invoiceCode,
        InvoiceStatus status,
        BigDecimal totalAmount,
        BigDecimal vatRate,
        LocalDateTime issuedAt,
        LocalDateTime dueDate,
        LocalDateTime paidAt,
        String notes,
        String customerUsername,
        String customerFullName,
        String customerEmail,
        String customerPhone,
        String organizationName,
        String taxCode,
        String billingAddress,
        String itemTitle,
        String itemReference,
        String paymentGateway,
        String transactionCode,
        LocalDateTime transactionCompletedAt,
        String bankName,
        String bankBin,
        String bankAccountNumber,
        String bankAccountName,
        String transferMemo) {}
