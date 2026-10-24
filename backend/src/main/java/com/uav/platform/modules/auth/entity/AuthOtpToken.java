package com.uav.platform.modules.auth.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.user.entity.AppUser;

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
}
