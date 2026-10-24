package com.uav.platform.modules.billing.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.billing.dto.request.CreateInvoiceRequest;
import com.uav.platform.modules.billing.dto.request.PayInvoiceRequest;
import com.uav.platform.modules.billing.dto.request.PaymentIpnRequest;
import com.uav.platform.modules.billing.dto.response.InvoiceResponse;
import com.uav.platform.modules.billing.dto.response.PaymentIpnResponse;
import com.uav.platform.modules.billing.dto.response.PaymentResponse;
import com.uav.platform.modules.billing.dto.response.ServicePlanResponse;
import com.uav.platform.modules.billing.enums.InvoiceStatus;

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

    /** Settles a PENDING invoice after an admin has matched the transfer on the bank statement. */
    InvoiceResponse confirmBankTransfer(Long id, String bankReference, Authentication auth);

    /**
     * Starts a plan change for the caller: returns the plan invoice to pay (reusing an open one), or null when the
     * plan is free and was applied immediately.
     */
    InvoiceResponse subscribe(String planCode, Authentication auth);
}
