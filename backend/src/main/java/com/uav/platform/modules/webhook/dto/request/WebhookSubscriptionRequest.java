package com.uav.platform.modules.webhook.dto.request;

import jakarta.validation.constraints.NotBlank;

public record WebhookSubscriptionRequest(
        @NotBlank String name,
        @NotBlank String targetUrl,
        @NotBlank String secretKey,
        @NotBlank String eventsSubscribed) {}
