package com.uav.platform.dto.request.webhook;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WebhookSubscriptionRequest(
        @NotBlank String name,
        @NotBlank String targetUrl,
        @NotBlank
                @Size(
                        min = 32,
                        max = 120,
                        message = "Khóa ký webhook phải dài từ 32 đến 120 ký tự.")
                String secretKey,
        @NotBlank String eventsSubscribed) {}
