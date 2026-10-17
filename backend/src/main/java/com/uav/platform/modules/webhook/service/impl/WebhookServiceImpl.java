package com.uav.platform.modules.webhook.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.webhook.dto.request.WebhookSubscriptionRequest;
import com.uav.platform.modules.webhook.dto.response.WebhookDeliveryLogResponse;
import com.uav.platform.modules.webhook.dto.response.WebhookSubscriptionResponse;
import com.uav.platform.modules.webhook.entity.WebhookDeliveryLog;
import com.uav.platform.modules.webhook.entity.WebhookSubscription;
import com.uav.platform.modules.webhook.mapper.WebhookMapper;
import com.uav.platform.modules.webhook.repository.WebhookDeliveryLogRepository;
import com.uav.platform.modules.webhook.repository.WebhookSubscriptionRepository;
import com.uav.platform.modules.webhook.service.WebhookEventQueue;
import com.uav.platform.modules.webhook.service.WebhookService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Service
@Transactional
public class WebhookServiceImpl implements WebhookService, WebhookEventQueue {

    private final WebhookSubscriptionRepository subscriptionRepository;
    private final WebhookDeliveryLogRepository deliveryLogRepository;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Value("${app.webhook.enabled:false}")
    private boolean enabled;

    @org.springframework.beans.factory.annotation.Value("${app.webhook.approved-urls:}")
    private String approvedUrls = "";

    @Autowired private com.uav.platform.modules.webhook.transport.WebhookTransport transport;

    @Autowired
    private org.springframework.transaction.PlatformTransactionManager transactionManager;

    @Override
    public String dispatchStatus() {
        return subscriptionRepository.findAll().stream()
                        .anyMatch(
                                sub ->
                                        sub.getDeletedAt() == null
                                                && Boolean.TRUE.equals(sub.getIsActive())
                                                && approved(sub.getTargetUrl()))
                ? "QUEUED"
                : "UNCONFIGURED";
    }

    private boolean approved(String url) {
        return enabled
                && java.util.Arrays.stream(approvedUrls.split(","))
                        .map(String::trim)
                        .anyMatch(url::equals);
    }

    public WebhookServiceImpl(
            WebhookSubscriptionRepository subscriptionRepository,
            WebhookDeliveryLogRepository deliveryLogRepository,
            @Autowired(required = false) ObjectMapper objectMapper) {
        this.subscriptionRepository = subscriptionRepository;
        this.deliveryLogRepository = deliveryLogRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WebhookSubscriptionResponse> listSubscriptions() {
        return subscriptionRepository.findAll().stream()
                .filter(sub -> sub.getDeletedAt() == null)
                .map(WebhookMapper::toSubscriptionResponse)
                .toList();
    }

    @Override
    public WebhookSubscriptionResponse createSubscription(WebhookSubscriptionRequest request) {
        return createSubscription(
                request.name(),
                request.targetUrl(),
                request.secretKey(),
                request.eventsSubscribed());
    }

    @Override
    public WebhookSubscriptionResponse createSubscription(
            String name, String targetUrl, String secretKey, String eventsSubscribed) {
        validateSafeWebhookUrl(targetUrl);
        WebhookSubscription sub =
                new WebhookSubscription(name, targetUrl.trim(), secretKey, eventsSubscribed);
        return WebhookMapper.toSubscriptionResponse(subscriptionRepository.save(sub));
    }

    public static void validateSafeWebhookUrl(String targetUrl) {
        com.uav.platform.modules.webhook.transport.PublicAddressPolicy.parse(targetUrl);
    }

    @Override
    public void toggleSubscription(Long id, boolean active) {
        WebhookSubscription sub =
                subscriptionRepository
                        .findByIdForUpdate(id)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Webhook subscription not found with id: " + id));
        if (sub.getDeletedAt() != null)
            throw SystemException.notFound("Webhook subscription was removed");
        sub.setIsActive(active);
        sub.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(sub);
    }

    @Override
    public void deleteSubscription(Long id) {
        var sub =
                subscriptionRepository
                        .findByIdForUpdate(id)
                        .orElseThrow(
                                () -> SystemException.notFound("Webhook subscription not found"));
        if (sub.getDeletedAt() != null) return;
        // Lock the destination before its deliveries, matching the HTTP worker lock order.
        // Any in-flight HTTP finishes before deletion commits; no later attempt can start.
        sub.setDeletedAt(LocalDateTime.now());
        sub.setIsActive(false);
        sub.setUpdatedAt(LocalDateTime.now());
        deliveryLogRepository.cancelPendingForSubscription(id);
    }

    @Override
    public void broadcastEvent(String eventType, Map<String, Object> eventData) {
        dispatchEvent(eventType, eventData);
    }

    @Override
    public String dispatchEvent(String eventType, Map<String, Object> data) {
        return enqueue(java.util.UUID.randomUUID().toString(), eventType, data).ready() > 0
                ? "QUEUED"
                : "UNCONFIGURED";
    }

    private record QueueResult(int total, int ready) {}

    /** Caller holds the durable event row lock; delivery insertion and local notification commit together. */
    @Override
    public int queueEvent(String eventId, String eventType, Map<String, Object> eventData) {
        return enqueue(eventId, eventType, eventData).total();
    }

    private QueueResult enqueue(String eventId, String eventType, Map<String, Object> eventData) {
        try {
            String payload =
                    objectMapper.writeValueAsString(
                            Map.of(
                                    "eventId",
                                    eventId,
                                    "eventType",
                                    eventType,
                                    "platform",
                                    "UAV_PAS_VJU",
                                    "data",
                                    eventData));
            var targets = subscriptionRepository.findActiveSubscribersForEvent(eventType);
            int ready = 0;
            for (var sub : targets) {
                if (approved(sub.getTargetUrl())) ready++;
                if (deliveryLogRepository.existsByEventIdAndSubscriptionId(eventId, sub.getId()))
                    continue;
                var entry = new WebhookDeliveryLog(sub, eventType, payload, null, null, 0, false);
                entry.setEventId(eventId);
                entry.setDeliveryStatus(approved(sub.getTargetUrl()) ? "QUEUED" : "UNCONFIGURED");
                deliveryLogRepository.save(entry);
            }
            return new QueueResult(targets.size(), ready);
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
            throw new IllegalArgumentException("WEBHOOK_PAYLOAD_INVALID");
        }
    }

    @org.springframework.scheduling.annotation.Scheduled(
            fixedDelayString = "${app.webhook.retry-delay-ms:60000}",
            initialDelayString = "${app.webhook.retry-delay-ms:60000}")
    public void retryDue() {
        for (Long id :
                deliveryLogRepository.dueIds(
                        LocalDateTime.now(), org.springframework.data.domain.PageRequest.of(0, 5)))
            processDelivery(id);
    }

    public void processDelivery(Long id) {
        var tx =
                new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        tx.setPropagationBehavior(
                org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.executeWithoutResult(
                status -> {
                    var subscriptionId =
                            deliveryLogRepository.subscriptionIdForDelivery(id).orElse(null);
                    if (subscriptionId == null) return;
                    var sub = subscriptionRepository.findByIdForUpdate(subscriptionId).orElse(null);
                    var entry = deliveryLogRepository.findByIdForUpdate(id).orElse(null);
                    if (entry == null
                            || java.util.Set.of(
                                            "DELIVERED", "FAILED", "CANCELLED", "LEGACY_UNVERIFIED")
                                    .contains(entry.getDeliveryStatus())) return;
                    if (sub == null || sub.getDeletedAt() != null) {
                        entry.setDeliveryStatus("CANCELLED");
                        entry.setResponseBody("DESTINATION_REMOVED");
                        return;
                    }
                    if (entry.getNextAttemptAt() == null
                            || entry.getNextAttemptAt().isAfter(LocalDateTime.now())) return;
                    if (sub == null
                            || !Boolean.TRUE.equals(sub.getIsActive())
                            || !approved(sub.getTargetUrl())) {
                        entry.setDeliveryStatus("UNCONFIGURED");
                        entry.setNextAttemptAt(LocalDateTime.now().plusMinutes(1));
                        return;
                    }
                    long start = System.nanoTime();
                    entry.setRetryCount(entry.getRetryCount() + 1);
                    entry.setAttemptedAt(LocalDateTime.now());
                    try {
                        int code =
                                transport.post(
                                        sub.getTargetUrl(),
                                        entry.getPayload(),
                                        calculateHmacSha256(entry.getPayload(), sub.getSecretKey()),
                                        entry.getEventType(),
                                        entry.getEventId());
                        entry.setResponseStatusCode(code);
                        entry.setIsSuccess(code >= 200 && code < 300);
                        entry.setResponseBody(
                                entry.getIsSuccess()
                                        ? "HTTP_ACCEPTED"
                                        : code >= 300 && code < 400
                                                ? "REDIRECT_BLOCKED"
                                                : "HTTP_REJECTED");
                    } catch (Exception ex) {
                        entry.setResponseStatusCode(null);
                        entry.setIsSuccess(false);
                        entry.setResponseBody("DELIVERY_BLOCKED_OR_FAILED");
                    }
                    entry.setDeliveryDurationMs((int) ((System.nanoTime() - start) / 1_000_000));
                    entry.setDeliveryStatus(
                            entry.getIsSuccess()
                                    ? "DELIVERED"
                                    : entry.getRetryCount() >= 3 ? "FAILED" : "RETRYING");
                    entry.setNextAttemptAt(LocalDateTime.now().plusMinutes(entry.getRetryCount()));
                });
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WebhookDeliveryLogResponse> listDeliveryLogs(Pageable pageable) {
        return deliveryLogRepository
                .findAllByOrderByAttemptedAtDesc(pageable)
                .map(WebhookMapper::toDeliveryLogResponse);
    }

    @Override
    public String calculateHmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec =
                    new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hmacBytes);
        } catch (Exception e) {
            throw new RuntimeException("Error calculating HMAC-SHA256", e);
        }
    }
}
