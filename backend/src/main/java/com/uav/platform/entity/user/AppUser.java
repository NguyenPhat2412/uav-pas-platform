package com.uav.platform.entity.user;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.service.impl.user.UserAccountPersistenceListener;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@EntityListeners(UserAccountPersistenceListener.class)
@Table(
        name = "users",
        uniqueConstraints =
                @UniqueConstraint(name = "uk_users_phone_number", columnNames = "phone_number"))
@org.hibernate.annotations.DynamicUpdate
@Getter
@Setter
@NoArgsConstructor
public class AppUser extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "zalo_id", unique = true, length = 100)
    private String zaloId;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    private UserRole role = UserRole.ROLE_PILOT;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts = 0;

    @Column(name = "lock_time")
    private LocalDateTime lockTime;

    @Column(name = "manual_locked", nullable = false, columnDefinition = "boolean default false")
    private boolean manualLocked = false;

    /**
     * New accounts start unverified; each sign-up path proves the address (or, for accounts an
     * administrator creates, sets it explicitly). Existing rows keep their stored value.
     */
    @Column(name = "email_verified", nullable = false, columnDefinition = "boolean default true")
    private boolean emailVerified = false;

    @Column(
            name = "two_factor_enabled",
            nullable = false,
            columnDefinition = "boolean default false")
    private boolean twoFactorEnabled = false;

    @Column(name = "two_factor_method", nullable = false, length = 20)
    private String twoFactorMethod = "EMAIL";

    @Column(name = "totp_secret", length = 128)
    private String totpSecret;

    /** Authenticator secret from a setup that has not been confirmed with a code yet. */
    @Column(name = "pending_totp_secret", length = 128)
    private String pendingTotpSecret;

    /** Last accepted TOTP time step; a code from this step or earlier is a replay. */
    @Column(name = "totp_last_step")
    private Long totpLastStep;

    public AppUser(
            String username,
            String email,
            String passwordHash,
            String phoneNumber,
            UserStatus status) {
        this(
                username,
                email,
                passwordHash,
                phoneNumber,
                null,
                null,
                null,
                UserRole.ROLE_PILOT,
                status);
    }

    public AppUser(
            String username,
            String email,
            String passwordHash,
            String phoneNumber,
            String zaloId,
            String fullName,
            String avatarUrl,
            UserStatus status) {
        this(
                username,
                email,
                passwordHash,
                phoneNumber,
                zaloId,
                fullName,
                avatarUrl,
                UserRole.ROLE_PILOT,
                status);
    }

    public AppUser(
            String username,
            String email,
            String passwordHash,
            String phoneNumber,
            String zaloId,
            String fullName,
            String avatarUrl,
            UserRole role,
            UserStatus status) {
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.phoneNumber = phoneNumber;
        this.zaloId = zaloId;
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
        this.role = role;
        this.status = status;
    }
}
