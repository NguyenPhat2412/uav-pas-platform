package com.uav.platform.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.enums.WalletTransactionType;

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

@Entity
@Table(name = "wallet_transactions")
@Getter
@Setter
@NoArgsConstructor
public class WalletTransaction extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wallet_id", nullable = false)
    private ProviderWallet wallet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payout_id")
    private ProviderPayout payout;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 30)
    private WalletTransactionType transactionType;

    @Column(name = "gross_amount_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal grossAmountVnd;

    @Column(name = "fee_amount_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal feeAmountVnd = BigDecimal.ZERO;

    @Column(name = "net_amount_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal netAmountVnd;

    @Column(name = "balance_after_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal balanceAfterVnd;

    @Column(length = 500)
    private String description;
}
