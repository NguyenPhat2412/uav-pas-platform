package com.uav.platform.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.enums.EscrowStatus;
import com.uav.platform.enums.InvoiceStatus;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id")
    private ProviderProfile provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "escrow_status", nullable = false, length = 24)
    private EscrowStatus escrowStatus = EscrowStatus.NONE;

    @Column(name = "platform_fee_rate", precision = 5, scale = 4)
    private BigDecimal platformFeeRate;

    @Column(name = "platform_fee_vnd", precision = 14, scale = 2)
    private BigDecimal platformFeeVnd;

    @Column(name = "provider_net_vnd", precision = 14, scale = 2)
    private BigDecimal providerNetVnd;

    @Column(name = "escrow_released_at")
    private LocalDateTime escrowReleasedAt;

    @Column(name = "last_emailed_at")
    private LocalDateTime lastEmailedAt;

    @Column(name = "last_emailed_to", length = 255)
    private String lastEmailedTo;

    public Invoice(
            String code,
            AppUser user,
            Mission mission,
            ServicePlan plan,
            BigDecimal amount,
            LocalDateTime dueDate,
            String notes) {
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
