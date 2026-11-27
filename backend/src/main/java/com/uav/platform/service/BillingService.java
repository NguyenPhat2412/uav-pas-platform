package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.CreateInvoiceRequest;
import com.uav.platform.dto.request.PayInvoiceRequest;
import com.uav.platform.dto.request.PaymentIpnRequest;
import com.uav.platform.dto.request.SepayWebhookRequest;
import com.uav.platform.dto.response.InvoiceEmailDispatchResponse;
import com.uav.platform.dto.response.InvoiceResponse;
import com.uav.platform.dto.response.PaymentIpnResponse;
import com.uav.platform.dto.response.PaymentResponse;
import com.uav.platform.dto.response.SepayWebhookResponse;
import com.uav.platform.dto.response.ServicePlanResponse;
import com.uav.platform.enums.InvoiceStatus;

import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface BillingService {
    List<ServicePlanResponse> listActivePlans();

    PageResponse<InvoiceResponse> listInvoices(Authentication auth, Pageable pageable);

    /** status narrows to one state; overdue keeps only PENDING invoices whose due date has passed. */
    PageResponse<InvoiceResponse> listInvoices(
            Authentication auth, Pageable pageable, InvoiceStatus status, boolean overdue);

    InvoiceResponse getInvoice(Long id, Authentication auth);

    InvoiceResponse createInvoice(CreateInvoiceRequest request, Authentication auth);

    PaymentResponse payInvoice(Long id, PayInvoiceRequest request, Authentication auth);

    PaymentIpnResponse processPaymentIpn(PaymentIpnRequest request);

    PaymentIpnResponse processPaymentIpn(
            PaymentIpnRequest request, String signatureHeader, Authentication auth);

    /** Auto-reconciles an incoming Vietnamese bank-transfer webhook (SePay / Casso format). */
    SepayWebhookResponse processSepayWebhook(
            SepayWebhookRequest request, String authorizationHeader, String webhookSecretHeader);

    /** Renders a standards-compliant ISO-32000 PDF invoice / payment receipt for an accessible invoice. */
    byte[] renderInvoiceReceiptPdf(Long id, Authentication auth);

    /** Sends or resends the itemized HTML invoice / payment receipt email with PDF attachment. */
    InvoiceEmailDispatchResponse sendInvoiceEmail(
            Long id, String recipientEmail, Authentication auth);

    /** Settles a PENDING invoice after an admin has matched the transfer on the bank statement. */
    InvoiceResponse confirmBankTransfer(Long id, String bankReference, Authentication auth);

    /**
     * Starts a plan change for the caller: returns the plan invoice to pay (reusing an open one), or null when the
     * plan is free and was applied immediately.
     */
    InvoiceResponse subscribe(String planCode, Authentication auth);

    /**
     * Cancels a PENDING invoice. A customer may cancel only their own plan invoice (a mission
     * invoice is a debt for work ordered); an admin may cancel any pending invoice.
     */
    InvoiceResponse cancelInvoice(Long id, String reason, Authentication auth);

    /** Cancels the open invoices of a mission that was cancelled or rejected. Returns how many. */
    int cancelOpenMissionInvoices(com.uav.platform.entity.Mission mission, String reason);

    /** Marks plan invoices unpaid past their due date EXPIRED. Mission invoices stay owed. */
    int expireOverduePlanInvoices();
}
