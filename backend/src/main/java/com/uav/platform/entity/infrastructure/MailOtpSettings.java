package com.uav.platform.entity.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Singleton row (id = 1) holding runtime admin overrides for SMTP delivery and OTP policies. */
@Entity
@Table(name = "mail_otp_settings")
@Getter
@Setter
@NoArgsConstructor
public class MailOtpSettings {
    public static final int SINGLETON_ID = 1;

    @Id
    @Column(name = "id")
    private Integer id = SINGLETON_ID;

    @Column(name = "mail_enabled")
    private Boolean mailEnabled;

    @Column(name = "smtp_host", length = 255)
    private String smtpHost;

    @Column(name = "smtp_port")
    private Integer smtpPort;

    @Column(name = "smtp_username", length = 255)
    private String smtpUsername;

    @Column(name = "smtp_password_encrypted", columnDefinition = "TEXT")
    private String smtpPasswordEncrypted;

    @Column(name = "smtp_password_hint", length = 32)
    private String smtpPasswordHint;

    @Column(name = "from_address", length = 255)
    private String fromAddress;

    @Column(name = "sender_display_name", length = 120)
    private String senderDisplayName;

    @Column(name = "smtp_auth")
    private Boolean smtpAuth;

    @Column(name = "smtp_starttls")
    private Boolean smtpStarttls;

    @Column(name = "otp_ttl_minutes")
    private Integer otpTtlMinutes;

    @Column(name = "resend_cooldown_seconds")
    private Integer resendCooldownSeconds;

    @Column(name = "max_otp_attempts")
    private Integer maxOtpAttempts;

    @Column(name = "otp_per_account")
    private Integer otpPerAccount;

    @Column(name = "otp_per_ip")
    private Integer otpPerIp;

    @Column(name = "max_emails_per_minute")
    private Integer maxEmailsPerMinute;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @PrePersist
    void onCreate() {
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    void onPersist() {
        this.updatedAt = LocalDateTime.now();
    }
}
