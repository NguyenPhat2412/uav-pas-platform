package com.uav.platform.modules.user.entity;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.common.entity.Identifiable;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@DisplayName("AppUser OOP Inheritance & Polymorphism Tests")
class AppUserOopTest {

    @Test
    @DisplayName("AppUser must inherit from BaseEntity and implement Identifiable & UserDetails")
    void appUser_ImplementsInterfacesAndExtendsBaseEntity() {
        AppUser user =
                new AppUser(
                        "pilot_alpha", "alpha@uav.vn", "hash123", "0912345678", UserStatus.ACTIVE);
        user.setId(1L);

        // Polymorphism tests
        assertTrue(user instanceof BaseEntity, "AppUser must be an instance of BaseEntity");
        assertTrue(user instanceof Identifiable, "AppUser must be an instance of Identifiable");
        assertTrue(user instanceof UserDetails, "AppUser must be an instance of UserDetails");

        assertEquals(1L, user.getId());
        assertEquals("pilot_alpha", user.getUsername());
        assertEquals(UserRole.ROLE_PILOT, user.getRole());
        assertTrue(user.isEnabled());
        assertTrue(user.isAccountNonLocked());
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

        assertEquals(1, commander.getAuthorities().size());
        GrantedAuthority auth = commander.getAuthorities().iterator().next();
        assertEquals("ROLE_COMMANDER", auth.getAuthority());
    }

    @Test
    @DisplayName("Suspended AppUser should reflect account locked state")
    void appUser_Suspended_ReflectsAccountLocked() {
        AppUser suspended =
                new AppUser("bad_actor", "bad@uav.vn", "hash", "0900000000", UserStatus.SUSPENDED);

        assertFalse(suspended.isAccountNonLocked());
        assertFalse(suspended.isEnabled());
    }

    @Test
    @DisplayName("AppUser should lock account after 5 failed attempts")
    void appUser_BruteForceLockAfterFiveAttempts() {
        AppUser user =
                new AppUser("locked_user", "lock@uav.vn", "hash", "0900000000", UserStatus.ACTIVE);
        assertFalse(user.isAccountLocked());
        assertTrue(user.isAccountNonLocked());

        for (int i = 0; i < 4; i++) {
            user.incrementFailedAttempts();
            assertFalse(user.isAccountLocked());
        }

        // 5th attempt triggers lock
        user.incrementFailedAttempts();
        assertTrue(user.isAccountLocked());
        assertFalse(user.isAccountNonLocked());

        // Reset
        user.resetFailedAttempts();
        assertFalse(user.isAccountLocked());
        assertTrue(user.isAccountNonLocked());
    }
}
