package com.uav.platform.modules.billing.dto.response;

public record PaymentIpnResponse(
        String status, String code, String message, String invoiceCode, String transactionCode) {}
