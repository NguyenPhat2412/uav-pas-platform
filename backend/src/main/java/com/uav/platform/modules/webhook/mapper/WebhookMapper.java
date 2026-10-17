package com.uav.platform.modules.webhook.mapper;

import com.uav.platform.modules.webhook.dto.response.WebhookDeliveryLogResponse;
import com.uav.platform.modules.webhook.dto.response.WebhookSubscriptionResponse;
import com.uav.platform.modules.webhook.entity.WebhookDeliveryLog;
import com.uav.platform.modules.webhook.entity.WebhookSubscription;

public final class WebhookMapper {

    private WebhookMapper() {}

    public static WebhookSubscriptionResponse toSubscriptionResponse(WebhookSubscription sub) {
        return new WebhookSubscriptionResponse(
                sub.getId(),
                sub.getName(),
                sub.getTargetUrl(),
                maskSecret(sub.getSecretKey()),
                sub.getEventsSubscribed(),
                sub.getIsActive(),
                sub.getCreatedAt(),
                sub.getUpdatedAt());
    }

    public static String maskSecret(String secretKey) {
        if (secretKey == null || secretKey.isBlank()) {
            return "****";
        }
        String trimmed = secretKey.trim();
        if (trimmed.length() <= 4) {
            return "****";
        }
        return "********" + trimmed.substring(trimmed.length() - 4);
    }

    public static WebhookDeliveryLogResponse toDeliveryLogResponse(WebhookDeliveryLog log) {
        return new WebhookDeliveryLogResponse(
                log.getId(),
                log.getSubscription() != null ? log.getSubscription().getId() : null,
                log.getSubscription() != null ? log.getSubscription().getName() : "N/A",
                log.getEventType(),
                log.getPayload(),
                log.getResponseStatusCode(),
                log.getResponseBody(),
                log.getDeliveryDurationMs(),
                log.getIsSuccess(),
                log.getRetryCount(),
                log.getAttemptedAt(),
                log.getEventId(),
                log.getDeliveryStatus());
    }
}
