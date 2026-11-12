package com.uav.platform.service.billing;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.response.billing.PaymentTransactionAdminResponse;

import org.springframework.data.domain.Pageable;

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
}
