package com.uav.platform.modules.billing.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.billing.config.request.CreateInvoiceRequest;
import com.uav.platform.modules.billing.config.request.PayInvoiceRequest;
import com.uav.platform.modules.billing.config.request.PaymentIpnRequest;
import com.uav.platform.modules.billing.config.response.InvoiceResponse;
import com.uav.platform.modules.billing.config.response.PaymentIpnResponse;
import com.uav.platform.modules.billing.config.response.PaymentResponse;
import com.uav.platform.modules.billing.config.response.ServicePlanResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface BillingService {
    List<ServicePlanResponse> listActivePlans();
    PageResponse<InvoiceResponse> listInvoices(Authentication auth, Pageable pageable);
    InvoiceResponse getInvoice(Long id, Authentication auth);
    InvoiceResponse createInvoice(CreateInvoiceRequest request, Authentication auth);
    PaymentResponse payInvoice(Long id, PayInvoiceRequest request, Authentication auth);
    PaymentIpnResponse processPaymentIpn(PaymentIpnRequest request);
    PaymentIpnResponse processPaymentIpn(PaymentIpnRequest request, String signatureHeader, Authentication auth);
}
