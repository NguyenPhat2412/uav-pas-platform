package com.uav.platform.service.impl.billing;

import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.billing.PaymentTransaction;
import com.uav.platform.entity.user.AppUser;

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
