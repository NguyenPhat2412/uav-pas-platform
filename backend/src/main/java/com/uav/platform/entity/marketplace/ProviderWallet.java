package com.uav.platform.entity.marketplace;

import com.uav.platform.common.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "provider_wallets")
@Getter
@Setter
@NoArgsConstructor
public class ProviderWallet extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false, unique = true)
    private ProviderProfile provider;

    @Column(name = "escrow_held_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal escrowHeldVnd = BigDecimal.ZERO;

    @Column(name = "available_balance_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal availableBalanceVnd = BigDecimal.ZERO;

    @Column(name = "pending_payout_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal pendingPayoutVnd = BigDecimal.ZERO;

    @Column(name = "total_earned_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalEarnedVnd = BigDecimal.ZERO;

    @Column(name = "total_withdrawn_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalWithdrawnVnd = BigDecimal.ZERO;
}
