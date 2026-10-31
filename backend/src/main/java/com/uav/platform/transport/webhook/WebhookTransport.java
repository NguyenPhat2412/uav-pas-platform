package com.uav.platform.transport.webhook;

import java.util.Map;

public interface WebhookTransport {
    /** Legacy form: only the body HMAC header (X-Signature-SHA256). */
    default int post(String url, String payload, String signature, String eventType, String eventId)
            throws Exception {
        return post(url, payload, Map.of("X-Signature-SHA256", signature), eventType, eventId);
    }

    /** signatureHeaders carries every signing header (legacy, timestamped and grace-period ones). */
    int post(
            String url,
            String payload,
            Map<String, String> signatureHeaders,
            String eventType,
            String eventId)
            throws Exception;
}
