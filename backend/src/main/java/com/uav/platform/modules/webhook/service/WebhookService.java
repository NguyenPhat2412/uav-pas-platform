package com.uav.platform.modules.webhook.service;

import com.uav.platform.modules.webhook.entity.WebhookDeliveryLog;
import com.uav.platform.modules.webhook.entity.WebhookSubscription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface WebhookService {

    List<WebhookSubscription> listSubscriptions();

    WebhookSubscription createSubscription(String name, String targetUrl, String secretKey, String eventsSubscribed);

    void toggleSubscription(Long id, boolean active);

    void deleteSubscription(Long id);

    void broadcastEvent(String eventType, Map<String, Object> eventData);

    Page<WebhookDeliveryLog> listDeliveryLogs(Pageable pageable);

    String calculateHmacSha256(String data, String key);
}
