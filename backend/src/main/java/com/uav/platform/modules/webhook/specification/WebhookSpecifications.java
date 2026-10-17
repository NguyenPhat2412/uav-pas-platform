package com.uav.platform.modules.webhook.specification;

import com.uav.platform.modules.webhook.entity.WebhookDeliveryLog;
import com.uav.platform.modules.webhook.entity.WebhookSubscription;

import org.springframework.data.jpa.domain.Specification;

public final class WebhookSpecifications {

    private WebhookSpecifications() {}

    public static Specification<WebhookSubscription> isActive() {
        return (root, query, cb) -> cb.isTrue(root.get("isActive"));
    }

    public static Specification<WebhookDeliveryLog> hasEventType(String eventType) {
        return (root, query, cb) ->
                (eventType == null || eventType.isBlank())
                        ? null
                        : cb.equal(root.get("eventType"), eventType);
    }

    public static Specification<WebhookDeliveryLog> isSuccessful(Boolean success) {
        return (root, query, cb) ->
                success == null ? null : cb.equal(root.get("isSuccess"), success);
    }
}
