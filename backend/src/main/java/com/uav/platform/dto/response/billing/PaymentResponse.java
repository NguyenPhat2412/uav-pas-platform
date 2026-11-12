package com.uav.platform.dto.response.billing;

import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.enums.billing.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
        Long transactionId,
        String transactionCode,
        Long invoiceId,
        String invoiceCode,
        BigDecimal amount,
        PaymentMethod paymentMethod,
        String status,
        InvoiceStatus invoiceStatus,
        LocalDateTime paidAt,
        String qrCodeUrl) {}
