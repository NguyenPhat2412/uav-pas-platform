package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.WebhookDeliveryLog;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface IWebhookDeliveryLogDao extends IGenericDao<Long, WebhookDeliveryLog> {
    java.util.Optional<Long> subscriptionIdForDelivery(Long id);

    int cancelPendingForSubscription(Long subscriptionId);

    int requeueUnconfigured(Long subscriptionId, java.time.LocalDateTime now);

    boolean existsByEventIdAndSubscriptionId(String eventId, Long subscriptionId);

    List<Long> dueIds(java.time.LocalDateTime now, Pageable pageable);

    java.util.Optional<WebhookDeliveryLog> findByIdForUpdate(Long id);

    List<WebhookDeliveryLog> findBySubscriptionIdOrderByAttemptedAtDesc(Long subscriptionId);

    Page<WebhookDeliveryLog> findAllByOrderByAttemptedAtDesc(Pageable pageable);
}
