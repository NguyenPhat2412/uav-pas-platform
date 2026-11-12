package com.uav.platform.entity.auth;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.user.AppUser;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "auth_otp_tokens")
@Getter
@Setter
@NoArgsConstructor
public class AuthOtpToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "purpose", nullable = false, length = 40)
    private String purpose;

    @Column(name = "code_hash", nullable = false, length = 255)
    private String codeHash;

    @Column(name = "challenge_token", nullable = false, unique = true, length = 128)
    private String challengeToken;

    @Column(name = "attempts", nullable = false)
    private int attempts = 0;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    /*
     * Details from a restarted sign-up of an unverified account. They are applied only after the
     * code proves the email, so whoever restarts the sign-up cannot rewrite the account first.
     */
    @Column(name = "pending_username", length = 50)
    private String pendingUsername;

    @Column(name = "pending_phone_number", length = 20)
    private String pendingPhoneNumber;

    @Column(name = "pending_password_hash", length = 255)
    private String pendingPasswordHash;
}
