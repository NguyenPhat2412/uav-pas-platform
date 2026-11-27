package com.uav.platform.service;

import com.uav.platform.entity.Invoice;

public interface FinancialOutboxService {
    void recordInvoiceIssued(Invoice invoice);

    void recordPaymentCompleted(Invoice invoice);

    void retryDue();

    void process(String id);

    default boolean handlesPaymentNotification() {
        return false;
    }
}
