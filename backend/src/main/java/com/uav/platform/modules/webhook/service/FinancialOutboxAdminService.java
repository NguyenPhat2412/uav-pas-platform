package com.uav.platform.modules.webhook.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.webhook.dto.response.FinancialOutboxEventResponse;

import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

public interface FinancialOutboxAdminService {
    PageResponse<FinancialOutboxEventResponse> list(String status, Pageable pageable);

    /** Requeues a failed or stuck event for the outbox worker; 409 when it is not retryable. */
    FinancialOutboxEventResponse retry(String id, Authentication auth);
}
