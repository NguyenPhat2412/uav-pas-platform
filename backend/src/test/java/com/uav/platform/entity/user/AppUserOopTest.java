package com.uav.platform.entity.user;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.common.entity.Identifiable;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.service.impl.user.UserAccountServiceImpl;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.time.LocalDateTime;

@DisplayName("User account service rules and AppUser data mapping")
class AppUserOopTest {

    @Test
    @DisplayName("AppUser retains persistence identity while services own account rules")
    void appUser_ImplementsInterfacesAndExtendsBaseEntity() {
        AppUser user =
                new AppUser(
                        "pilot_alpha", "alpha@uav.vn", "hash123", "0912345678", UserStatus.ACTIVE);
        user.setId(1L);

        // Polymorphism tests
        assertTrue(user instanceof BaseEntity, "AppUser must be an instance of BaseEntity");
        assertTrue(user instanceof Identifiable, "AppUser must be an instance of Identifiable");

        assertEquals(1L, user.getId());
        assertEquals("pilot_alpha", user.getUsername());
        assertEquals(UserRole.ROLE_PILOT, user.getRole());
        assertTrue(UserAccountServiceImpl.isEnabled(user));
        assertTrue(UserAccountServiceImpl.isAccountNonLocked(user));
    }

    @Test
    @DisplayName("AppUser should grant correct Role authority polymorphically")
    void appUser_RoleAuthorities() {
        AppUser commander =
                new AppUser(
                        "commander_01",
                        "cmd@uav.vn",
                        "hash",
                        "0900000000",
                        null,
                        null,
                        null,
                        UserRole.ROLE_COMMANDER,
                        UserStatus.ACTIVE);

        assertEquals(1, UserAccountServiceImpl.getAuthorities(commander).size());
        GrantedAuthority auth = UserAccountServiceImpl.getAuthorities(commander).iterator().next();
        assertEquals("ROLE_COMMANDER", auth.getAuthority());
    }

    @Test
    @DisplayName("Suspended AppUser should reflect account locked state")
    void appUser_Suspended_ReflectsAccountLocked() {
        AppUser suspended =
                new AppUser("bad_actor", "bad@uav.vn", "hash", "0900000000", UserStatus.SUSPENDED);

        assertFalse(UserAccountServiceImpl.isAccountNonLocked(suspended));
        assertFalse(UserAccountServiceImpl.isEnabled(suspended));
    }

    @Test
    @DisplayName("AppUser should lock account after 5 failed attempts")
    void appUser_BruteForceLockAfterFiveAttempts() {
        AppUser user =
                new AppUser("locked_user", "lock@uav.vn", "hash", "0900000000", UserStatus.ACTIVE);
        assertFalse(UserAccountServiceImpl.isAccountLocked(user));
        assertTrue(UserAccountServiceImpl.isAccountNonLocked(user));

        for (int i = 0; i < 4; i++) {
            UserAccountServiceImpl.incrementFailedAttempts(user);
            assertFalse(UserAccountServiceImpl.isAccountLocked(user));
        }

        // 5th attempt triggers the sign-in lock; existing sessions are not affected by it.
        UserAccountServiceImpl.incrementFailedAttempts(user);
        assertTrue(UserAccountServiceImpl.isAccountLocked(user));
        assertTrue(UserAccountServiceImpl.isAccountNonLocked(user));
        UserAccountServiceImpl.lockAccount(user);
        assertFalse(UserAccountServiceImpl.isAccountNonLocked(user));
        user.setManualLocked(false);

        // Reset
        UserAccountServiceImpl.resetFailedAttempts(user);
        assertFalse(UserAccountServiceImpl.isAccountLocked(user));
        assertTrue(UserAccountServiceImpl.isAccountNonLocked(user));
    }

    @Test
    void expiredTemporaryLockResetsAttemptsButManualLockDoesNotExpire() {
        AppUser user = new AppUser();
        user.setFailedAttempts(5);
        user.setLockTime(LocalDateTime.now().minusMinutes(16));
        assertFalse(UserAccountServiceImpl.isAccountLocked(user));
        assertEquals(0, user.getFailedAttempts());
        assertNull(user.getLockTime());

        UserAccountServiceImpl.lockAccount(user);
        user.setLockTime(LocalDateTime.now().minusDays(1));
        user.setFailedAttempts(7);
        assertTrue(UserAccountServiceImpl.isAccountLocked(user));
        assertEquals(7, user.getFailedAttempts());
        UserAccountServiceImpl.unlockAccount(user);
        assertFalse(user.isManualLocked());
        assertEquals(0, user.getFailedAttempts());
        assertNull(user.getLockTime());
    }

    @Test
    void recentTemporaryLockRemainsAndSuspensionDoesNotResetExpiredLock() {
        AppUser user = new AppUser();
        user.setFailedAttempts(5);
        user.setLockTime(LocalDateTime.now());
        assertTrue(UserAccountServiceImpl.isAccountLocked(user));
        assertEquals(5, user.getFailedAttempts());
        user.setStatus(UserStatus.SUSPENDED);
        user.setLockTime(LocalDateTime.now().minusMinutes(16));
        assertFalse(UserAccountServiceImpl.isAccountNonLocked(user));
        assertEquals(5, user.getFailedAttempts());
    }

    @Test
    void userCreationAndServiceAssignmentsPreserveNullDefaults() {
        AppUser user =
                UserAccountServiceImpl.createUser(
                        "pilot",
                        "pilot@uav.vn",
                        "hash",
                        "0900000000",
                        null,
                        null,
                        null,
                        null,
                        null);
        assertEquals(UserRole.ROLE_PILOT, user.getRole());
        assertEquals(UserStatus.ACTIVE, user.getStatus());
        user.setRole(UserRole.ROLE_COMMANDER);
        user.setStatus(UserStatus.SUSPENDED);
        UserAccountServiceImpl.setRole(user, null);
        UserAccountServiceImpl.setStatus(user, null);
        assertEquals(UserRole.ROLE_PILOT, user.getRole());
        assertEquals(UserStatus.ACTIVE, user.getStatus());
        user.setRole(null);
        assertEquals(
                "ROLE_PILOT",
                UserAccountServiceImpl.getAuthorities(user).iterator().next().getAuthority());
    }
}
