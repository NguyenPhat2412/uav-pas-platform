package com.uav.platform.modules.billing.dto.record;

import java.math.BigDecimal;

/**
 * Effective receiving account and VAT rate after resolving admin settings over environment
 * defaults. Values are trimmed; missing text values are empty strings, never null.
 */
public record PaymentAccountSettings(
        String bankBin,
        String bankName,
        String accountNumber,
        String accountName,
        BigDecimal vatRate) {

    /** Same rule the bank-transfer flow has always used to decide whether payment is possible. */
    public boolean configured() {
        return bankBin.matches("\\d{6}")
                && accountNumber.matches("[0-9A-Za-z]{4,19}")
                && !accountName.isEmpty();
    }
}
