package com.uav.platform.dto.response.webhook;

import java.time.LocalDateTime;

/**
 * Returned only by rotate-secret. secretKey is the full new signing secret and is never
 * returned again; every other subscription response carries the masked value.
 */
public record WebhookSecretRotationResponse(
        Long subscriptionId, String secretKey, String maskedSecret, LocalDateTime rotatedAt) {}
