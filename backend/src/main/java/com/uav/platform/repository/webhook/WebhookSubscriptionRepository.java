package com.uav.platform.repository.webhook;

import com.uav.platform.entity.webhook.WebhookSubscription;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WebhookSubscriptionRepository
        extends JpaRepository<WebhookSubscription, Long>,
                JpaSpecificationExecutor<WebhookSubscription> {

    List<WebhookSubscription> findByIsActiveTrue();

    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from WebhookSubscription s where s.id=:id")
    java.util.Optional<WebhookSubscription> findByIdForUpdate(Long id);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_READ)
    @Query(
            "SELECT s FROM WebhookSubscription s WHERE s.deletedAt IS NULL AND s.isActive = true AND s.eventsSubscribed LIKE %:eventType% ORDER BY s.id")
    List<WebhookSubscription> findActiveSubscribersForEvent(@Param("eventType") String eventType);
}
