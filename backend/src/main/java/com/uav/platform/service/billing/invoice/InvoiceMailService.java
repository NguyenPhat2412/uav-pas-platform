package com.uav.platform.service.billing.invoice;

import com.uav.platform.dto.response.billing.invoice.InvoiceEmailDispatchResponse;
import com.uav.platform.entity.billing.Invoice;

public interface InvoiceMailService {

    /**
     * Dispatches the itemized HTML invoice or payment receipt email with PDF attachment for a
     * financial outbox event ({@code INVOICE_ISSUED} or {@code PAYMENT_COMPLETED}). Best-effort:
     * returns {@code false} when SMTP is disabled or delivery fails without throwing.
     */
    boolean sendForOutboxEvent(Long invoiceId, String eventType);

    /**
     * Explicitly sends or resends the itemized HTML invoice or payment receipt email with PDF
     * attachment for an already-authorized invoice. Throws {@code SystemException} if SMTP is
     * disabled or delivery fails.
     */
    InvoiceEmailDispatchResponse sendInvoiceEmail(Invoice invoice, String recipientEmailOverride);
}
