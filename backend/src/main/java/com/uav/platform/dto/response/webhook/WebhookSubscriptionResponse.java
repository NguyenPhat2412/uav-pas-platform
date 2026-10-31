package com.uav.platform.dto.response.webhook;

import java.time.LocalDateTime;

public record WebhookSubscriptionResponse(
        Long id,
        String name,
        String targetUrl,
        String secretKey,
        String eventsSubscribed,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
