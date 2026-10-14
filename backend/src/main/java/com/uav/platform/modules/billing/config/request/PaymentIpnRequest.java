package com.uav.platform.modules.billing.config.request;

import java.math.BigDecimal;

public record PaymentIpnRequest(
    String invoiceCode,
    Long invoiceId,
    String transactionCode,
    BigDecimal amount,
    String status
) {
}
