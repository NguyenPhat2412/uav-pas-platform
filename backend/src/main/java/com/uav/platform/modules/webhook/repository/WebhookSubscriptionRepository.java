package com.uav.platform.modules.webhook.repository;

import com.uav.platform.modules.webhook.entity.WebhookSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WebhookSubscriptionRepository extends JpaRepository<WebhookSubscription, Long>, JpaSpecificationExecutor<WebhookSubscription> {

    List<WebhookSubscription> findByIsActiveTrue();

    @Query("SELECT s FROM WebhookSubscription s WHERE s.isActive = true AND s.eventsSubscribed LIKE %:eventType%")
    List<WebhookSubscription> findActiveSubscribersForEvent(@Param("eventType") String eventType);
}
