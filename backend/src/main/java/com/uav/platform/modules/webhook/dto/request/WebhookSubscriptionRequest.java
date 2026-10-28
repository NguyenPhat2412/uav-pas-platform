package com.uav.platform.modules.webhook.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WebhookSubscriptionRequest(
        @NotBlank String name,
        @NotBlank String targetUrl,
        @NotBlank @Size(min = 32, max = 120, message = "WEBHOOK_SECRET_TOO_SHORT") String secretKey,
        @NotBlank String eventsSubscribed) {}
