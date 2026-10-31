package com.uav.platform.service.webhook;

import java.util.Map;

/** Queues durable deliveries inside the caller's financial-outbox transaction. */
public interface WebhookEventQueue {
    int queueEvent(String eventId, String eventType, Map<String, Object> eventData);
}
