package com.uav.platform.dao.webhook;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.webhook.WebhookSubscription;

import java.util.List;

public interface IWebhookSubscriptionDao extends IGenericDao<Long, WebhookSubscription> {
    List<WebhookSubscription> findByIsActiveTrue();

    java.util.Optional<WebhookSubscription> findByIdForUpdate(Long id);

    List<WebhookSubscription> findActiveSubscribersForEvent(String eventType);
}
