package com.uav.platform.dto.response.webhook;

import java.time.LocalDateTime;

public record WebhookDeliveryLogResponse(
        Long id,
        Long subscriptionId,
        String subscriptionName,
        String eventType,
        String payload,
        Integer responseStatusCode,
        String responseBody,
        Integer deliveryDurationMs,
        Boolean isSuccess,
        Integer retryCount,
        LocalDateTime attemptedAt,
        String eventId,
        String deliveryStatus) {}
