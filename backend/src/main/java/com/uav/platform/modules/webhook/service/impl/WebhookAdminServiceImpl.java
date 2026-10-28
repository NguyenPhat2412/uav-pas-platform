package com.uav.platform.modules.webhook.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.webhook.dto.response.WebhookDeliveryLogResponse;
import com.uav.platform.modules.webhook.dto.response.WebhookSecretRotationResponse;
import com.uav.platform.modules.webhook.entity.WebhookDeliveryLog;
import com.uav.platform.modules.webhook.entity.WebhookSubscription;
import com.uav.platform.modules.webhook.mapper.WebhookMapper;
import com.uav.platform.modules.webhook.repository.WebhookDeliveryLogRepository;
import com.uav.platform.modules.webhook.repository.WebhookSubscriptionRepository;
import com.uav.platform.modules.webhook.service.WebhookAdminService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class WebhookAdminServiceImpl implements WebhookAdminService {
    static final String SECRET_PREFIX = "whsec_";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final WebhookSubscriptionRepository subscriptions;
    private final WebhookDeliveryLogRepository deliveries;
    private final WebhookMapper mapper;
    private final AuditLogService audit;

    @Override
    @Transactional
    public WebhookDeliveryLogResponse retryDelivery(Long deliveryId, Authentication auth) {
        Long subscriptionId =
                deliveries
                        .subscriptionIdForDelivery(deliveryId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Webhook delivery not found",
                                                "WEBHOOK_DELIVERY_NOT_FOUND"));
        // Same lock order as the delivery worker: destination first, then the delivery row.
        WebhookSubscription sub = subscriptions.findByIdForUpdate(subscriptionId).orElse(null);
        WebhookDeliveryLog entry =
                deliveries
                        .findByIdForUpdate(deliveryId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Webhook delivery not found",
                                                "WEBHOOK_DELIVERY_NOT_FOUND"));
        checkRetryable(entry, sub);
        int previousAttempts = entry.getRetryCount() == null ? 0 : entry.getRetryCount();
        requeue(entry, LocalDateTime.now());
        audit.record(
                null,
                auth != null ? auth.getName() : null,
                AuditAction.STATUS_CHANGE,
                "WEBHOOK_DELIVERY",
                String.valueOf(entry.getId()),
                "manual retry: FAILED -> QUEUED, previousAttempts=" + previousAttempts);
        return mapper.toDeliveryLogResponse(entry);
    }

    /** Only terminal FAILED deliveries to a live, active destination can be requeued. */
    static void checkRetryable(WebhookDeliveryLog entry, WebhookSubscription sub) {
        if (!"FAILED".equals(entry.getDeliveryStatus()))
            throw SystemException.conflict(
                    "Only failed deliveries can be retried", "WEBHOOK_DELIVERY_NOT_FAILED");
        if (sub == null || sub.getDeletedAt() != null)
            throw SystemException.conflict(
                    "The webhook destination was removed", "WEBHOOK_SUBSCRIPTION_REMOVED");
        if (!Boolean.TRUE.equals(sub.getIsActive()))
            throw SystemException.conflict(
                    "Enable the webhook destination before retrying",
                    "WEBHOOK_SUBSCRIPTION_INACTIVE");
    }

    /**
     * Gives the delivery a fresh attempt budget (the worker marks FAILED at 3 attempts) and makes it
     * due now. The event id and payload are unchanged, so receivers can still de-duplicate.
     */
    static void requeue(WebhookDeliveryLog entry, LocalDateTime now) {
        entry.setDeliveryStatus("QUEUED");
        entry.setRetryCount(0);
        entry.setIsSuccess(false);
        entry.setNextAttemptAt(now);
    }

    @Override
    @Transactional
    public WebhookSecretRotationResponse rotateSecret(Long subscriptionId, Authentication auth) {
        WebhookSubscription sub =
                subscriptions
                        .findByIdForUpdate(subscriptionId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Webhook subscription not found",
                                                "WEBHOOK_SUBSCRIPTION_NOT_FOUND"));
        if (sub.getDeletedAt() != null)
            throw SystemException.notFound(
                    "Webhook subscription was removed", "WEBHOOK_SUBSCRIPTION_NOT_FOUND");
        String secret = generateSecret();
        LocalDateTime now = LocalDateTime.now();
        sub.setSecretKey(secret);
        sub.setUpdatedAt(now);
        subscriptions.save(sub);
        // Never put the secret (or any part of it) in the audit trail.
        audit.record(
                null,
                auth != null ? auth.getName() : null,
                AuditAction.UPDATE,
                "WEBHOOK_SUBSCRIPTION",
                String.valueOf(sub.getId()),
                "signing secret rotated");
        return new WebhookSecretRotationResponse(
                sub.getId(), secret, mapper.maskSecret(secret), now);
    }

    /** 256 random bits, URL-safe base64 without padding: "whsec_" + 43 chars (fits VARCHAR(120)). */
    static String generateSecret() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return SECRET_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
