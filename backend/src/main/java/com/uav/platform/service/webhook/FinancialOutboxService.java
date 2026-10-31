package com.uav.platform.service.webhook;

import com.uav.platform.entity.billing.Invoice;

public interface FinancialOutboxService {
    void recordInvoiceIssued(Invoice invoice);

    void recordPaymentCompleted(Invoice invoice);

    void retryDue();

    void process(String id);
}
