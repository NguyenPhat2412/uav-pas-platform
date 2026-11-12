package com.uav.platform.dto.response.billing;

public record PaymentIpnResponse(
        String status, String code, String message, String invoiceCode, String transactionCode) {}
