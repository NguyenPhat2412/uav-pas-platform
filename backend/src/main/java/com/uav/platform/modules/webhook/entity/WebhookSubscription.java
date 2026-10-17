package com.uav.platform.modules.webhook.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "webhook_subscriptions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class WebhookSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "target_url", nullable = false, length = 500)
    private String targetUrl;

    @Column(name = "secret_key", nullable = false, length = 120)
    private String secretKey;

    @Column(name = "events_subscribed", nullable = false, columnDefinition = "TEXT")
    private String eventsSubscribed;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public WebhookSubscription() {}

    public WebhookSubscription(
            String name, String targetUrl, String secretKey, String eventsSubscribed) {
        this.name = name;
        this.targetUrl = targetUrl;
        this.secretKey = secretKey;
        this.eventsSubscribed = eventsSubscribed;
        this.isActive = true;
    }
}
