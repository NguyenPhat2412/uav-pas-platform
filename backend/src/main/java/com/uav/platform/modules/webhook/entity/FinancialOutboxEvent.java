package com.uav.platform.modules.webhook.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "financial_outbox_events")
@Getter
@Setter
public class FinancialOutboxEvent {
    @Id
    @Column(length = 150)
    private String id;

    @Column(nullable = false, length = 80)
    private String eventType;

    @Column(nullable = false)
    private Long invoiceId;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(nullable = false, length = 24)
    private String status = "PENDING";

    @Column(nullable = false)
    private int attempts;

    @Column(nullable = false)
    private boolean notificationCreated;

    @Column(length = 80)
    private String lastError;

    @Column(nullable = false)
    private LocalDateTime nextAttemptAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public FinancialOutboxEvent() {}

    public FinancialOutboxEvent(
            String id, String type, Long invoiceId, Long userId, String payload) {
        this.id = id;
        this.eventType = type;
        this.invoiceId = invoiceId;
        this.userId = userId;
        this.payload = payload;
    }
}
