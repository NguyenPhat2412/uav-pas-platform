package com.uav.platform.modules.webhook.mapper;

import com.uav.platform.modules.webhook.entity.WebhookDeliveryLog;
import com.uav.platform.modules.webhook.entity.WebhookSubscription;

import java.util.Map;

public final class WebhookMapper {

    private WebhookMapper() {}

    public static Map<String, Object> toSubscriptionSummary(WebhookSubscription sub) {
        return Map.of(
            "id", sub.getId() != null ? sub.getId() : 0L,
            "name", sub.getName() != null ? sub.getName() : "",
            "targetUrl", sub.getTargetUrl() != null ? sub.getTargetUrl() : "",
            "eventsSubscribed", sub.getEventsSubscribed() != null ? sub.getEventsSubscribed() : "",
            "isActive", Boolean.TRUE.equals(sub.getIsActive())
        );
    }

    public static Map<String, Object> toLogSummary(WebhookDeliveryLog log) {
        return Map.of(
            "id", log.getId() != null ? log.getId() : 0L,
            "eventType", log.getEventType() != null ? log.getEventType() : "",
            "responseStatus", log.getResponseStatusCode() != null ? log.getResponseStatusCode() : 0,
            "durationMs", log.getDeliveryDurationMs() != null ? log.getDeliveryDurationMs() : 0,
            "isSuccess", Boolean.TRUE.equals(log.getIsSuccess())
        );
    }
}
