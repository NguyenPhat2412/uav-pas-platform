package com.uav.platform.entity.marketplace;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.enums.marketplace.PayoutStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "provider_payouts")
@Getter
@Setter
@NoArgsConstructor
public class ProviderPayout extends BaseEntity {

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    @Column(name = "amount_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal amountVnd;

    @Column(name = "bank_name", nullable = false, length = 120)
    private String bankName;

    @Column(name = "bank_account_number", nullable = false, length = 60)
    private String bankAccountNumber;

    @Column(name = "bank_account_holder", nullable = false, length = 120)
    private String bankAccountHolder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private PayoutStatus status = PayoutStatus.PENDING;

    @Column(name = "provider_note", length = 500)
    private String providerNote;

    @Column(name = "admin_note", length = 500)
    private String adminNote;

    @Column(name = "bank_transfer_ref", length = 120)
    private String bankTransferRef;

    @Column(name = "processed_by", length = 100)
    private String processedBy;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;
}
