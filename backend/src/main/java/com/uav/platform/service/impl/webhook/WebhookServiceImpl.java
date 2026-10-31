package com.uav.platform.service.impl.webhook;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dto.record.webhook.QueueResult;
import com.uav.platform.dto.request.webhook.WebhookSubscriptionRequest;
import com.uav.platform.dto.request.webhook.WebhookTestDispatchRequest;
import com.uav.platform.dto.response.webhook.WebhookDeliveryLogResponse;
import com.uav.platform.dto.response.webhook.WebhookDispatchResponse;
import com.uav.platform.dto.response.webhook.WebhookSubscriptionResponse;
import com.uav.platform.entity.webhook.WebhookSubscription;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.webhook.WebhookMapper;
import com.uav.platform.repository.webhook.WebhookDeliveryLogRepository;
import com.uav.platform.repository.webhook.WebhookSubscriptionRepository;
import com.uav.platform.service.webhook.WebhookEventQueue;
import com.uav.platform.service.webhook.WebhookService;

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
    /** After a secret rotation the old secret keeps signing deliveries for this long. */
    public static final java.time.Duration SECRET_ROTATION_GRACE = java.time.Duration.ofHours(24);

    /** Shortest accepted signing secret (32 characters, about 190 bits for random base64). */
    public static final int MIN_SECRET_LENGTH = 32;

    /** Deliveries attempted per worker run (was 5; parked UNCONFIGURED rows no longer use slots). */
    @org.springframework.beans.factory.annotation.Value("${app.webhook.batch-size:25}")
    private int batchSize = 25;

    @Override
    public WebhookDispatchResponse dispatchTest(WebhookTestDispatchRequest request) {
        String eventType =
                (String) request.payload().getOrDefault("eventType", "SAR_EMERGENCY_TRIGGERED");
        String outcome = dispatchEvent(eventType, request.payload());
        return new WebhookDispatchResponse(
                outcome,
                "Đã ghi nhận yêu cầu. Kiểm tra nhật ký để biết kết quả HTTP; chưa xác nhận bên nhận đã xử lý.");
    }

    private final WebhookSubscriptionRepository subscriptionRepository;
    private final WebhookDeliveryLogRepository deliveryLogRepository;
    private final ObjectMapper objectMapper;
    private final WebhookMapper webhookMapper;

    @org.springframework.beans.factory.annotation.Value("${app.webhook.enabled:false}")
    private boolean enabled;

    @org.springframework.beans.factory.annotation.Value("${app.webhook.approved-urls:}")
    private String approvedUrls = "";

    @Autowired private com.uav.platform.transport.webhook.WebhookTransport transport;

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
            ObjectMapper objectMapper) {
        this(
                subscriptionRepository,
                deliveryLogRepository,
                objectMapper,
                org.mapstruct.factory.Mappers.getMapper(WebhookMapper.class));
    }

    @Autowired
    public WebhookServiceImpl(
            WebhookSubscriptionRepository subscriptionRepository,
            WebhookDeliveryLogRepository deliveryLogRepository,
            @Autowired(required = false) ObjectMapper objectMapper,
            WebhookMapper webhookMapper) {
        this.subscriptionRepository = subscriptionRepository;
        this.deliveryLogRepository = deliveryLogRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.webhookMapper = webhookMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WebhookSubscriptionResponse> listSubscriptions() {
        return subscriptionRepository.findAll().stream()
                .filter(sub -> sub.getDeletedAt() == null)
                .map(webhookMapper::toSubscriptionResponse)
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
        if (secretKey == null || secretKey.trim().length() < MIN_SECRET_LENGTH)
            throw SystemException.badRequest(
                            "Khóa ký webhook phải dài ít nhất 32 ký tự.",
                            "WEBHOOK_SECRET_TOO_SHORT")
                    .at("secretKey");
        WebhookSubscription sub =
                new WebhookSubscription(name, targetUrl.trim(), secretKey, eventsSubscribed);
        return webhookMapper.toSubscriptionResponse(subscriptionRepository.save(sub));
    }

    public static void validateSafeWebhookUrl(String targetUrl) {
        com.uav.platform.transport.webhook.PublicAddressPolicy.parse(targetUrl);
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
        // Deliveries parked while the destination was off are released once it can receive them.
        if (active && approved(sub.getTargetUrl()))
            deliveryLogRepository.requeueUnconfigured(id, LocalDateTime.now());
    }

    /**
     * Approval comes from configuration (app.webhook.enabled / approved-urls), which only changes
     * with a restart: on startup, release parked deliveries of every approved active destination.
     */
    @org.springframework.context.event.EventListener(
            org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void requeueApprovedDestinations() {
        if (!enabled) return;
        LocalDateTime now = LocalDateTime.now();
        for (var sub : subscriptionRepository.findByIsActiveTrue()) {
            if (sub.getDeletedAt() == null && approved(sub.getTargetUrl()))
                deliveryLogRepository.requeueUnconfigured(sub.getId(), now);
        }
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
                var entry =
                        WebhookDeliveryLogOperations.create(
                                sub, eventType, payload, null, null, 0, false);
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
                        LocalDateTime.now(),
                        org.springframework.data.domain.PageRequest.of(0, Math.max(1, batchSize))))
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
                        // Parked: the due query skips UNCONFIGURED until the destination is
                        // enabled (toggle) or approved (startup), so it cannot starve real work.
                        entry.setDeliveryStatus("UNCONFIGURED");
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
                                        signatureHeaders(
                                                sub,
                                                entry.getPayload(),
                                                java.time.Instant.now().getEpochSecond(),
                                                LocalDateTime.now()),
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
                .map(webhookMapper::toDeliveryLogResponse);
    }

    /**
     * Signing headers for one attempt. X-Signature-SHA256 (HMAC of the body) is kept for existing
     * receivers. New receivers verify X-Webhook-Signature: "t=<unix seconds>,v1=<hex>" where v1 is
     * HMAC-SHA256 of "<t>.<body>" and can reject stale timestamps (replay). During the grace period
     * after a rotation a second v1 (old secret) and X-Signature-SHA256-Previous are added.
     */
    public java.util.Map<String, String> signatureHeaders(
            WebhookSubscription sub, String payload, long timestamp, LocalDateTime now) {
        var headers = new java.util.LinkedHashMap<String, String>();
        headers.put("X-Signature-SHA256", calculateHmacSha256(payload, sub.getSecretKey()));
        headers.put("X-Webhook-Timestamp", Long.toString(timestamp));
        String signed = timestamp + "." + payload;
        StringBuilder signature =
                new StringBuilder("t=")
                        .append(timestamp)
                        .append(",v1=")
                        .append(calculateHmacSha256(signed, sub.getSecretKey()));
        if (sub.getPreviousSecretKey() != null
                && sub.getPreviousSecretExpiresAt() != null
                && now.isBefore(sub.getPreviousSecretExpiresAt())) {
            signature
                    .append(",v1=")
                    .append(calculateHmacSha256(signed, sub.getPreviousSecretKey()));
            headers.put(
                    "X-Signature-SHA256-Previous",
                    calculateHmacSha256(payload, sub.getPreviousSecretKey()));
        }
        headers.put("X-Webhook-Signature", signature.toString());
        return headers;
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
            throw new IllegalStateException("Error calculating HMAC-SHA256", e);
        }
    }
}
