package com.uav.platform.specification.webhook;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.webhook.FinancialOutboxEvent;
import com.uav.platform.entity.webhook.WebhookDeliveryLog;
import com.uav.platform.entity.webhook.WebhookSubscription;

public final class WebhookSpecifications {

    private WebhookSpecifications() {}

    public static HibernateSpecification<WebhookSubscription> isActive() {
        return (root, query, cb) -> cb.isTrue(root.get("isActive"));
    }

    public static HibernateSpecification<WebhookDeliveryLog> hasEventType(String eventType) {
        return (root, query, cb) ->
                (eventType == null || eventType.isBlank())
                        ? null
                        : cb.equal(root.get("eventType"), eventType);
    }

    public static HibernateSpecification<WebhookDeliveryLog> isSuccessful(Boolean success) {
        return (root, query, cb) ->
                success == null ? null : cb.equal(root.get("isSuccess"), success);
    }

    public static HibernateSpecification<FinancialOutboxEvent> outboxStatus(String status) {
        return (root, query, cb) ->
                status == null || status.isBlank()
                        ? null
                        : cb.equal(
                                root.get("status"),
                                status.trim().toUpperCase(java.util.Locale.ROOT));
    }
}
