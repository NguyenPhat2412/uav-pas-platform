package com.uav.platform.modules.user.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Entity
@Table(
        name = "users",
        uniqueConstraints =
                @UniqueConstraint(name = "uk_users_phone_number", columnNames = "phone_number"))
@org.hibernate.annotations.DynamicUpdate
@Getter
@Setter
@NoArgsConstructor
public class AppUser extends BaseEntity implements UserDetails {

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
    private java.time.LocalDateTime lockTime;

    @Column(name = "manual_locked", nullable = false, columnDefinition = "boolean default false")
    private boolean manualLocked = false;

    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final long LOCK_TIME_DURATION_MINUTES = 15;

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
        this.role = role != null ? role : UserRole.ROLE_PILOT;
        this.status = status != null ? status : UserStatus.ACTIVE;
    }

    @Override
    protected void onCreate() {
        super.onCreate();
        if (this.role == null) {
            this.role = UserRole.ROLE_PILOT;
        }
        if (this.status == null) {
            this.status = UserStatus.ACTIVE;
        }
    }

    // --- UserDetails Polymorphic Implementations ---

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(
                new SimpleGrantedAuthority(
                        this.role != null ? this.role.name() : UserRole.ROLE_PILOT.name()));
    }

    @Override
    public String getPassword() {
        return this.passwordHash;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return this.status != UserStatus.SUSPENDED && !isAccountLocked();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return this.status == UserStatus.ACTIVE;
    }

    // --- Getters & Setters ---

    @Override
    public String getUsername() {
        return username;
    }

    public void setRole(UserRole role) {
        this.role = role != null ? role : UserRole.ROLE_PILOT;
    }

    public void setStatus(UserStatus status) {
        this.status = status != null ? status : UserStatus.ACTIVE;
    }

    public void incrementFailedAttempts() {
        this.failedAttempts++;
        if (this.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            this.lockTime = java.time.LocalDateTime.now();
        }
    }

    public void resetFailedAttempts() {
        this.failedAttempts = 0;
        this.lockTime = null;
    }

    public boolean isAccountLocked() {
        if (this.manualLocked) {
            return true;
        }
        if (this.lockTime == null) {
            return false;
        }
        boolean expired =
                java.time.LocalDateTime.now()
                        .isAfter(this.lockTime.plusMinutes(LOCK_TIME_DURATION_MINUTES));
        if (expired) {
            resetFailedAttempts();
            return false;
        }
        return true;
    }

    public void lockAccount() {
        this.manualLocked = true;
        this.lockTime = java.time.LocalDateTime.now();
    }

    public void unlockAccount() {
        this.manualLocked = false;
        resetFailedAttempts();
    }
}
