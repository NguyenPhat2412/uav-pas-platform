package com.uav.platform.modules.billing.service.impl;

import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.PaymentTransaction;
import com.uav.platform.modules.user.entity.AppUser;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Initializes the transaction creation timestamp in the service layer. */
public final class PaymentTransactionOperations {
    private PaymentTransactionOperations() {}

    public static PaymentTransaction create(
            Invoice invoice, AppUser user, String transactionCode, BigDecimal amount) {
        var payment = new PaymentTransaction(invoice, user, transactionCode, amount);
        payment.setCreatedAt(LocalDateTime.now());
        return payment;
    }
}
