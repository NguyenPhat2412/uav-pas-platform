package com.uav.platform.modules.billing.config.response;

import com.uav.platform.modules.billing.common.InvoiceStatus;
import com.uav.platform.modules.billing.common.PaymentMethod;
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
    String qrCodeUrl
) {}
