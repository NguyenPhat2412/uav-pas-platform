package com.uav.platform.modules.webhook.transport;

public interface WebhookTransport {
    int post(String url, String payload, String signature, String eventType, String eventId)
            throws Exception;
}
