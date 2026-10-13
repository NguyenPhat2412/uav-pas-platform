package com.uav.platform.modules.billing.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.billing.common.InvoiceStatus;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.user.entity.AppUser;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Invoice extends BaseEntity {

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id")
    private Mission mission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id")
    private ServicePlan plan;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InvoiceStatus status = InvoiceStatus.PENDING;

    @Column(name = "due_date", nullable = false)
    private LocalDateTime dueDate;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(length = 500)
    private String notes;

    public Invoice(String code, AppUser user, Mission mission, ServicePlan plan, BigDecimal amount, LocalDateTime dueDate, String notes) {
        this.code = code;
        this.user = user;
        this.mission = mission;
        this.plan = plan;
        this.amount = amount;
        this.dueDate = dueDate;
        this.notes = notes;
        this.status = InvoiceStatus.PENDING;
    }
}
