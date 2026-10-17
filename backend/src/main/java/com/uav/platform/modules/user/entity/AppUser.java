package com.uav.platform.modules.user.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.service.impl.UserAccountPersistenceListener;

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
