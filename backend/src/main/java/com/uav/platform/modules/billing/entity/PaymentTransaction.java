package com.uav.platform.modules.billing.entity;

import com.uav.platform.modules.user.entity.AppUser;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "transaction_code", nullable = false, unique = true, length = 100)
    private String transactionCode;

    @Column(name = "gateway_name", nullable = false, length = 50)
    private String gatewayName = "VIETQR_NAPAS";

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "bank_bin", length = 20)
    private String bankBin;

    @Column(name = "bank_account_number", length = 50)
    private String bankAccountNumber;

    @Column(name = "emvco_payload", columnDefinition = "TEXT")
    private String emvcoPayload;

    @Column(name = "raw_ipn_callback", columnDefinition = "TEXT")
    private String rawIpnCallback;

    @Column(nullable = false, length = 30)
    private String status = "PENDING"; // PENDING, SUCCESS, FAILED

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public PaymentTransaction() {}

    public PaymentTransaction(
            Invoice invoice, AppUser user, String transactionCode, BigDecimal amount) {
        this.invoice = invoice;
        this.user = user;
        this.transactionCode = transactionCode;
        this.amount = amount;
        this.status = "PENDING";
        this.createdAt = LocalDateTime.now();
    }
}
