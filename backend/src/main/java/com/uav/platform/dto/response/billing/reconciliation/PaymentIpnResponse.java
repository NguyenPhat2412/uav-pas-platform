package com.uav.platform.dto.response.billing.reconciliation;

public record PaymentIpnResponse(
        String status, String code, String message, String invoiceCode, String transactionCode) {}
