package com.uav.platform.modules.webhook.service;

import java.util.Map;

/** Queues durable deliveries inside the caller's financial-outbox transaction. */
public interface WebhookEventQueue {
    int queueEvent(String eventId, String eventType, Map<String, Object> eventData);
}
