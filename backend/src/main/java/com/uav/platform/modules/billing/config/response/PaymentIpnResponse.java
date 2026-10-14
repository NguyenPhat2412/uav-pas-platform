package com.uav.platform.modules.billing.config.response;

public record PaymentIpnResponse(
    String status,
    String code,
    String message,
    String invoiceCode,
    String transactionCode
) {
}
