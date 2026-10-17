package com.uav.platform.modules.billing.dto.response;

import com.uav.platform.modules.billing.enums.InvoiceStatus;
import com.uav.platform.modules.billing.enums.PaymentMethod;

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
