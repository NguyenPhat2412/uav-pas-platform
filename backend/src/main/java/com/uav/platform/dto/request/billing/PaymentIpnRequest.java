package com.uav.platform.dto.request.billing;

import java.math.BigDecimal;

public record PaymentIpnRequest(
        String invoiceCode,
        Long invoiceId,
        String transactionCode,
        BigDecimal amount,
        String status) {}
