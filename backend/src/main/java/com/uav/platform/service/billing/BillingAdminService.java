package com.uav.platform.service.billing;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.billing.PaymentGatewayConfigUpdateRequest;
import com.uav.platform.dto.response.billing.PaymentGatewayConfigResponse;
import com.uav.platform.dto.response.billing.PaymentTransactionAdminResponse;

import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;

public interface BillingAdminService {
    /** Payment/IPN records, newest first. All filters are optional; to is inclusive. */
    PageResponse<PaymentTransactionAdminResponse> listTransactions(
            String status,
            String gateway,
            LocalDate from,
            LocalDate to,
            Long invoiceId,
            String keyword,
            Pageable pageable);

    PaymentGatewayConfigResponse getPaymentGatewayConfig();

    /**
     * Records that an admin sent back a transfer that could not settle its invoice (wrong amount,
     * late, or for a cancelled invoice). The original evidence is kept untouched.
     */
    PaymentTransactionAdminResponse refundTransaction(
            Long id, String bankReference, String note, Authentication auth);

    PaymentGatewayConfigResponse updatePaymentGatewayConfig(
            PaymentGatewayConfigUpdateRequest request, Authentication auth);
}
