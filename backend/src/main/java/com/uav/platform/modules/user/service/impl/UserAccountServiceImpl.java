package com.uav.platform.modules.user.service.impl;

import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/** Shared account rules used by authentication, authorization, and user administration. */
public final class UserAccountServiceImpl {
    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final long LOCK_TIME_DURATION_MINUTES = 15;

    private UserAccountServiceImpl() {}

    public static AppUser createUser(
            String username,
            String email,
            String passwordHash,
            String phoneNumber,
            String zaloId,
            String fullName,
            String avatarUrl,
            UserRole role,
            UserStatus status) {
        AppUser user =
                new AppUser(
                        username,
                        email,
                        passwordHash,
                        phoneNumber,
                        zaloId,
                        fullName,
                        avatarUrl,
                        role,
                        status);
        normalizeDefaults(user);
        return user;
    }

    public static void normalizeDefaults(AppUser user) {
        setRole(user, user.getRole());
        setStatus(user, user.getStatus());
    }

    public static void setRole(AppUser user, UserRole role) {
        user.setRole(role != null ? role : UserRole.ROLE_PILOT);
    }

    public static void setStatus(AppUser user, UserStatus status) {
        user.setStatus(status != null ? status : UserStatus.ACTIVE);
    }

    public static Collection<? extends GrantedAuthority> getAuthorities(AppUser user) {
        return List.of(
                new SimpleGrantedAuthority(
                        user.getRole() != null
                                ? user.getRole().name()
                                : UserRole.ROLE_PILOT.name()));
    }

    public static boolean isEnabled(AppUser user) {
        return user.getStatus() == UserStatus.ACTIVE;
    }

    /**
     * Whether an existing session (access token, permissions) may keep working: false only for a
     * suspension or an administrator's lock. The temporary lock after failed passwords blocks new
     * sign-ins only (see {@link #isAccountLocked}); otherwise anyone could sign a logged-in user
     * out by typing five wrong passwords for them.
     */
    public static boolean isAccountNonLocked(AppUser user) {
        return user.getStatus() != UserStatus.SUSPENDED && !user.isManualLocked();
    }

    public static void incrementFailedAttempts(AppUser user) {
        user.setFailedAttempts(user.getFailedAttempts() + 1);
        if (user.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            user.setLockTime(LocalDateTime.now());
        }
    }

    public static void resetFailedAttempts(AppUser user) {
        user.setFailedAttempts(0);
        user.setLockTime(null);
    }

    public static boolean isAccountLocked(AppUser user) {
        if (user.isManualLocked()) return true;
        if (user.getLockTime() == null) return false;
        if (LocalDateTime.now()
                .isAfter(user.getLockTime().plusMinutes(LOCK_TIME_DURATION_MINUTES))) {
            resetFailedAttempts(user);
            return false;
        }
        return true;
    }

    public static void lockAccount(AppUser user) {
        user.setManualLocked(true);
        user.setLockTime(LocalDateTime.now());
    }

    public static void unlockAccount(AppUser user) {
        user.setManualLocked(false);
        resetFailedAttempts(user);
    }
}
