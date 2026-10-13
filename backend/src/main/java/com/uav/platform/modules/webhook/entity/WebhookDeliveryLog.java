package com.uav.platform.modules.webhook.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "webhook_delivery_logs")
public class WebhookDeliveryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private WebhookSubscription subscription;

    @Column(name = "event_type", nullable = false, length = 80)
    private String eventType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "response_status_code")
    private Integer responseStatusCode;

    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    @Column(name = "delivery_duration_ms")
    private Integer deliveryDurationMs;

    @Column(name = "is_success", nullable = false)
    private Boolean isSuccess = false;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;

    @Column(name = "attempted_at")
    private LocalDateTime attemptedAt = LocalDateTime.now();

    public WebhookDeliveryLog() {}

    public WebhookDeliveryLog(WebhookSubscription subscription, String eventType, String payload,
                              Integer responseStatusCode, String responseBody, Integer deliveryDurationMs,
                              Boolean isSuccess) {
        this.subscription = subscription;
        this.eventType = eventType;
        this.payload = payload;
        this.responseStatusCode = responseStatusCode;
        this.responseBody = responseBody;
        this.deliveryDurationMs = deliveryDurationMs;
        this.isSuccess = isSuccess;
        this.retryCount = 0;
        this.attemptedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public WebhookSubscription getSubscription() { return subscription; }
    public void setSubscription(WebhookSubscription subscription) { this.subscription = subscription; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public Integer getResponseStatusCode() { return responseStatusCode; }
    public void setResponseStatusCode(Integer responseStatusCode) { this.responseStatusCode = responseStatusCode; }

    public String getResponseBody() { return responseBody; }
    public void setResponseBody(String responseBody) { this.responseBody = responseBody; }

    public Integer getDeliveryDurationMs() { return deliveryDurationMs; }
    public void setDeliveryDurationMs(Integer deliveryDurationMs) { this.deliveryDurationMs = deliveryDurationMs; }

    public Boolean getIsSuccess() { return isSuccess; }
    public void setIsSuccess(Boolean isSuccess) { this.isSuccess = isSuccess; }

    public Integer getRetryCount() { return retryCount; }
    public void setRetryCount(Integer retryCount) { this.retryCount = retryCount; }

    public LocalDateTime getAttemptedAt() { return attemptedAt; }
    public void setAttemptedAt(LocalDateTime attemptedAt) { this.attemptedAt = attemptedAt; }
}
