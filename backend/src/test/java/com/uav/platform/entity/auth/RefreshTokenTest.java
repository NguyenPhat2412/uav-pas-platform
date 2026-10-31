package com.uav.platform.entity.auth;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.service.impl.auth.RefreshTokenServiceImpl;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@DisplayName("RefreshToken Entity & OOP Contract Tests")
class RefreshTokenTest {

    @Test
    @DisplayName("RefreshToken should correctly validate active and expired tokens")
    void refreshToken_ValidityChecks() {
        AppUser user =
                new AppUser("testpilot", "pilot@uav.vn", "hash", "0912345678", UserStatus.ACTIVE);
        user.setId(10L);

        Instant future = Instant.now().plus(7, ChronoUnit.DAYS);
        RefreshToken token = new RefreshToken(user, "valid-token-string", future);

        assertFalse(RefreshTokenServiceImpl.isExpired(token));
        assertFalse(token.isRevoked());
        assertTrue(RefreshTokenServiceImpl.isValid(token));
        assertEquals("testpilot", token.getUser().getUsername());
        assertEquals("valid-token-string", token.getToken());

        // Revoke token
        RefreshTokenServiceImpl.revoke(token);
        assertTrue(token.isRevoked());
        assertFalse(RefreshTokenServiceImpl.isValid(token));

        // Expired token
        Instant past = Instant.now().minus(1, ChronoUnit.HOURS);
        RefreshToken expiredToken = new RefreshToken(user, "expired-token", past);
        assertTrue(RefreshTokenServiceImpl.isExpired(expiredToken));
        assertFalse(RefreshTokenServiceImpl.isValid(expiredToken));
    }

    @Test
    @DisplayName("RefreshToken should inherit BaseEntity identity and timestamps")
    void refreshToken_InheritsBaseEntity() {
        RefreshToken token = new RefreshToken();
        token.setId(99L);

        assertEquals(99L, token.getId());
        assertFalse(token.isNew());
    }
}
