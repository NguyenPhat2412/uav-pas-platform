package com.uav.platform.modules.webhook.service;

import com.uav.platform.modules.billing.entity.Invoice;

public interface FinancialOutboxService {
    void recordInvoiceIssued(Invoice invoice);

    void recordPaymentCompleted(Invoice invoice);

    void retryDue();

    void process(String id);
}
