package com.uav.platform.repository.webhook;

import com.uav.platform.entity.webhook.WebhookDeliveryLog;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WebhookDeliveryLogRepository
        extends JpaRepository<WebhookDeliveryLog, Long>,
                JpaSpecificationExecutor<WebhookDeliveryLog> {

    @org.springframework.data.jpa.repository.Query(
            "select d.subscription.id from WebhookDeliveryLog d where d.id=:id")
    java.util.Optional<Long> subscriptionIdForDelivery(Long id);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
            "update WebhookDeliveryLog d set d.deliveryStatus='CANCELLED', d.responseBody='DESTINATION_REMOVED' where d.subscription.id=:subscriptionId and d.deliveryStatus in ('QUEUED','RETRYING','UNCONFIGURED')")
    int cancelPendingForSubscription(Long subscriptionId);

    /** Un-parks deliveries held while their destination was inactive or not approved. */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
            "update WebhookDeliveryLog d set d.deliveryStatus='QUEUED', d.nextAttemptAt=:now where d.subscription.id=:subscriptionId and d.deliveryStatus='UNCONFIGURED'")
    int requeueUnconfigured(Long subscriptionId, java.time.LocalDateTime now);

    boolean existsByEventIdAndSubscriptionId(String eventId, Long subscriptionId);

    @org.springframework.data.jpa.repository.Query(
            "select d.id from WebhookDeliveryLog d where d.deliveryStatus in ('QUEUED','RETRYING') and d.nextAttemptAt<=:now order by d.nextAttemptAt,d.id")
    List<Long> dueIds(java.time.LocalDateTime now, Pageable pageable);

    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query(
            "select d from WebhookDeliveryLog d where d.id=:id")
    java.util.Optional<WebhookDeliveryLog> findByIdForUpdate(Long id);

    List<WebhookDeliveryLog> findBySubscriptionIdOrderByAttemptedAtDesc(Long subscriptionId);

    Page<WebhookDeliveryLog> findAllByOrderByAttemptedAtDesc(Pageable pageable);
}
