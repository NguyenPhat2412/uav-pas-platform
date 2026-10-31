package com.uav.platform.service.impl.webhook;

import com.uav.platform.entity.webhook.WebhookDeliveryLog;
import com.uav.platform.entity.webhook.WebhookSubscription;

import java.time.LocalDateTime;

/** Initializes the delivery attempt timestamp at creation in the service layer. */
public final class WebhookDeliveryLogOperations {
    private WebhookDeliveryLogOperations() {}

    public static WebhookDeliveryLog create(
            WebhookSubscription subscription,
            String eventType,
            String payload,
            Integer responseStatusCode,
            String responseBody,
            Integer deliveryDurationMs,
            Boolean isSuccess) {
        var delivery =
                new WebhookDeliveryLog(
                        subscription,
                        eventType,
                        payload,
                        responseStatusCode,
                        responseBody,
                        deliveryDurationMs,
                        isSuccess);
        delivery.setAttemptedAt(LocalDateTime.now());
        return delivery;
    }
}
