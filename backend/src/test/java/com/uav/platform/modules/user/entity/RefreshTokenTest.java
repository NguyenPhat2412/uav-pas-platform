package com.uav.platform.modules.user.entity;

import com.uav.platform.modules.user.common.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("RefreshToken Entity & OOP Contract Tests")
class RefreshTokenTest {

    @Test
    @DisplayName("RefreshToken should correctly validate active and expired tokens")
    void refreshToken_ValidityChecks() {
        AppUser user = new AppUser("testpilot", "pilot@uav.vn", "hash", "0912345678", UserStatus.ACTIVE);
        user.setId(10L);

        Instant future = Instant.now().plus(7, ChronoUnit.DAYS);
        RefreshToken token = new RefreshToken(user, "valid-token-string", future);

        assertFalse(token.isExpired());
        assertFalse(token.isRevoked());
        assertTrue(token.isValid());
        assertEquals("testpilot", token.getUser().getUsername());
        assertEquals("valid-token-string", token.getToken());

        // Revoke token
        token.revoke();
        assertTrue(token.isRevoked());
        assertFalse(token.isValid());

        // Expired token
        Instant past = Instant.now().minus(1, ChronoUnit.HOURS);
        RefreshToken expiredToken = new RefreshToken(user, "expired-token", past);
        assertTrue(expiredToken.isExpired());
        assertFalse(expiredToken.isValid());
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
