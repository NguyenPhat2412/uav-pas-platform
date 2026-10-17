package com.uav.platform.modules.billing.dto.record;

import com.uav.platform.modules.billing.dto.request.PaymentIpnRequest;

import java.math.BigDecimal;

public record IpnSignaturePayload(
        String invoiceCode,
        Long invoiceId,
        BigDecimal amount,
        String transactionCode,
        String status) {

    public static IpnSignaturePayload from(PaymentIpnRequest request) {
        return new IpnSignaturePayload(
                request.invoiceCode(),
                request.invoiceId(),
                request.amount(),
                request.transactionCode(),
                request.status());
    }

    public String canonical() {
        return (invoiceCode != null ? invoiceCode : "")
                + "|"
                + (invoiceId != null ? invoiceId : "")
                + "|"
                + (amount != null ? amount.stripTrailingZeros().toPlainString() : "")
                + "|"
                + (transactionCode != null ? transactionCode : "")
                + "|"
                + (status != null ? status : "");
    }
}
