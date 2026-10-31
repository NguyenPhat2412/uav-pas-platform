package com.uav.platform.service.billing;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.billing.CreateInvoiceRequest;
import com.uav.platform.dto.request.billing.PayInvoiceRequest;
import com.uav.platform.dto.request.billing.PaymentIpnRequest;
import com.uav.platform.dto.response.billing.InvoiceResponse;
import com.uav.platform.dto.response.billing.PaymentIpnResponse;
import com.uav.platform.dto.response.billing.PaymentResponse;
import com.uav.platform.dto.response.billing.ServicePlanResponse;
import com.uav.platform.enums.billing.InvoiceStatus;

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
