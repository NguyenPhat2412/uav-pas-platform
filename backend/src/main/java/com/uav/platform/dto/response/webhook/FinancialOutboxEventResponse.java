package com.uav.platform.dto.response.webhook;

import java.time.LocalDateTime;

/** retryable tells the admin UI whether POST .../retry would be accepted right now. */
public record FinancialOutboxEventResponse(
        String id,
        String eventType,
        Long invoiceId,
        Long userId,
        String payload,
        String status,
        int attempts,
        boolean notificationCreated,
        String lastError,
        LocalDateTime nextAttemptAt,
        LocalDateTime createdAt,
        boolean retryable) {}
