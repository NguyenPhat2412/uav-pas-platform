package com.uav.platform.dto.response;

public record SepayWebhookResponse(
        boolean success,
        String status,
        String message,
        String invoiceCode,
        String transactionCode) {}
