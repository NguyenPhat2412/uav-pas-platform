package com.uav.platform.modules.billing.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.mission.entity.Mission;

import jakarta.persistence.*;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "mission_billing_jobs")
public class MissionBillingJob extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mission_id", nullable = false, unique = true)
    private Mission mission;

    @Column(name = "planned_hours", nullable = false)
    private double plannedHours;

    @Column(precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(nullable = false)
    private int attempts;

    @Column(name = "last_error", length = 100)
    private String lastError;

    @Column(name = "next_attempt_at", nullable = false)
    private LocalDateTime nextAttemptAt = LocalDateTime.now();

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", unique = true)
    private Invoice invoice;

    public MissionBillingJob(Mission mission, double plannedHours, BigDecimal amount) {
        this.mission = mission;
        this.plannedHours = plannedHours;
        this.amount = amount;
    }
}
