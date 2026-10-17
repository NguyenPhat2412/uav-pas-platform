package com.uav.platform.modules.webhook.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "webhook_delivery_logs")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class WebhookDeliveryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
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

    @Column(name = "event_id", length = 150)
    private String eventId;

    @Column(name = "delivery_status", nullable = false, length = 24)
    private String deliveryStatus = "QUEUED";

    @Column(name = "next_attempt_at")
    private LocalDateTime nextAttemptAt = LocalDateTime.now();

    public WebhookDeliveryLog() {}

    public WebhookDeliveryLog(
            WebhookSubscription subscription,
            String eventType,
            String payload,
            Integer responseStatusCode,
            String responseBody,
            Integer deliveryDurationMs,
            Boolean isSuccess) {
        this.subscription = subscription;
        this.eventType = eventType;
        this.payload = payload;
        this.responseStatusCode = responseStatusCode;
        this.responseBody = responseBody;
        this.deliveryDurationMs = deliveryDurationMs;
        this.isSuccess = isSuccess;
        this.retryCount = 0;
    }
}
