package com.uav.platform.modules.webhook.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.webhook.dto.response.FinancialOutboxEventResponse;
import com.uav.platform.modules.webhook.entity.FinancialOutboxEvent;
import com.uav.platform.modules.webhook.repository.FinancialOutboxRepository;
import com.uav.platform.modules.webhook.service.FinancialOutboxAdminService;
import com.uav.platform.modules.webhook.specification.WebhookSpecifications;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Admin view over financial_outbox_events. Retry only moves next_attempt_at/status; the existing
 * scheduled worker (FinancialOutboxServiceImpl) still does the processing under its row lock, so
 * notification and webhook enqueueing stay exactly-once.
 */
@Service
@RequiredArgsConstructor
public class FinancialOutboxAdminServiceImpl implements FinancialOutboxAdminService {
    static final String COMPLETED = "LOCAL_COMPLETED";

    private final FinancialOutboxRepository events;
    private final AuditLogService audit;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<FinancialOutboxEventResponse> list(String status, Pageable pageable) {
        Pageable sorted =
                PageRequest.of(
                        pageable.getPageNumber(),
                        pageable.getPageSize(),
                        Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id")));
        return PageResponse.from(
                events.findAll(WebhookSpecifications.outboxStatus(status), sorted),
                FinancialOutboxAdminServiceImpl::toResponse);
    }

    @Override
    @Transactional
    public FinancialOutboxEventResponse retry(String id, Authentication auth) {
        FinancialOutboxEvent event =
                events.findByIdForUpdate(id)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Financial event not found",
                                                "OUTBOX_EVENT_NOT_FOUND"));
        if (!retryable(event))
            throw SystemException.conflict(
                    "Only failed or stuck financial events can be retried",
                    "OUTBOX_EVENT_NOT_RETRYABLE");
        String previous = event.getStatus();
        requeue(event, LocalDateTime.now());
        audit.record(
                null,
                auth != null ? auth.getName() : null,
                AuditAction.STATUS_CHANGE,
                "FINANCIAL_OUTBOX_EVENT",
                event.getId(),
                "retry requested: status "
                        + previous
                        + " -> PENDING, attempts="
                        + event.getAttempts());
        return toResponse(event);
    }

    /**
     * Retryable = FAILED, WAITING_SUBSCRIBERS (no webhook target yet), or PENDING after a failed
     * attempt (lastError set, so it sits in back-off). Completed events and fresh PENDING events
     * the worker has not touched yet are left alone.
     */
    static boolean retryable(FinancialOutboxEvent event) {
        String status = event.getStatus();
        if (status == null || COMPLETED.equals(status)) return false;
        return switch (status) {
            case "FAILED", "WAITING_SUBSCRIBERS" -> true;
            case "PENDING" -> event.getLastError() != null;
            default -> false;
        };
    }

    /** Makes the event due now; attempts and lastError stay as history until the worker runs. */
    static void requeue(FinancialOutboxEvent event, LocalDateTime now) {
        event.setStatus("PENDING");
        event.setNextAttemptAt(now);
    }

    static FinancialOutboxEventResponse toResponse(FinancialOutboxEvent e) {
        return new FinancialOutboxEventResponse(
                e.getId(),
                e.getEventType(),
                e.getInvoiceId(),
                e.getUserId(),
                e.getPayload(),
                e.getStatus(),
                e.getAttempts(),
                e.isNotificationCreated(),
                e.getLastError(),
                e.getNextAttemptAt(),
                e.getCreatedAt(),
                retryable(e));
    }
}
