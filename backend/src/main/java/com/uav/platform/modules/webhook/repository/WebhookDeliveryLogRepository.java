package com.uav.platform.modules.webhook.repository;

import com.uav.platform.modules.webhook.entity.WebhookDeliveryLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WebhookDeliveryLogRepository extends JpaRepository<WebhookDeliveryLog, Long>, JpaSpecificationExecutor<WebhookDeliveryLog> {

    List<WebhookDeliveryLog> findBySubscriptionIdOrderByAttemptedAtDesc(Long subscriptionId);

    Page<WebhookDeliveryLog> findAllByOrderByAttemptedAtDesc(Pageable pageable);
}
