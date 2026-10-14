package com.uav.platform.modules.webhook.service;

import com.uav.platform.modules.webhook.config.request.WebhookSubscriptionRequest;
import com.uav.platform.modules.webhook.config.response.WebhookDeliveryLogResponse;
import com.uav.platform.modules.webhook.config.response.WebhookSubscriptionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface WebhookService {

    List<WebhookSubscriptionResponse> listSubscriptions();

    WebhookSubscriptionResponse createSubscription(WebhookSubscriptionRequest request);

    WebhookSubscriptionResponse createSubscription(String name, String targetUrl, String secretKey, String eventsSubscribed);

    void toggleSubscription(Long id, boolean active);

    void deleteSubscription(Long id);

    void broadcastEvent(String eventType, Map<String, Object> eventData);

    Page<WebhookDeliveryLogResponse> listDeliveryLogs(Pageable pageable);

    String calculateHmacSha256(String data, String key);
}
