package com.uav.platform.service.webhook;

import com.uav.platform.dto.request.webhook.WebhookSubscriptionRequest;
import com.uav.platform.dto.request.webhook.WebhookTestDispatchRequest;
import com.uav.platform.dto.response.webhook.WebhookDeliveryLogResponse;
import com.uav.platform.dto.response.webhook.WebhookDispatchResponse;
import com.uav.platform.dto.response.webhook.WebhookSubscriptionResponse;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface WebhookService {
    WebhookDispatchResponse dispatchTest(WebhookTestDispatchRequest request);

    List<WebhookSubscriptionResponse> listSubscriptions();

    WebhookSubscriptionResponse createSubscription(WebhookSubscriptionRequest request);

    WebhookSubscriptionResponse createSubscription(
            String name, String targetUrl, String secretKey, String eventsSubscribed);

    void toggleSubscription(Long id, boolean active);

    void deleteSubscription(Long id);

    default String dispatchStatus() {
        return "UNCONFIGURED";
    }

    default String dispatchEvent(String eventType, Map<String, Object> data) {
        broadcastEvent(eventType, data);
        return "UNCONFIGURED";
    }

    void broadcastEvent(String eventType, Map<String, Object> eventData);

    Page<WebhookDeliveryLogResponse> listDeliveryLogs(Pageable pageable);

    String calculateHmacSha256(String data, String key);
}
