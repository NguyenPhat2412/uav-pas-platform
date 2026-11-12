package com.uav.platform.security.jwt;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JwtTokenProviderTest {

    private static final String TEST_SECRET =
            "test-secret-key-that-is-at-least-256-bits-long-for-hmac-sha256-testing-purposes";
    private static final long EXPIRATION_MS = 3600000L; // 1 hour

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(TEST_SECRET, EXPIRATION_MS);
    }

    @Test
    void generateToken_Success() {
        String token = jwtTokenProvider.generateToken(1L, "testuser", "test@example.com");

        assertNotNull(token);
        assertFalse(token.isBlank());
        assertTrue(jwtTokenProvider.validateToken(token));
    }

    @Test
    void getUsernameFromToken_Success() {
        String token = jwtTokenProvider.generateToken(123L, "alice", "alice@example.com");

        String username = jwtTokenProvider.getUsernameFromToken(token);
        assertEquals("alice", username);
    }

    @Test
    void getUserIdFromToken_Success() {
        String token = jwtTokenProvider.generateToken(456L, "bob", "bob@example.com");

        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        assertEquals(456L, userId);
    }

    @Test
    void validateToken_ValidToken_ReturnsTrue() {
        String token = jwtTokenProvider.generateToken(1L, "validuser", "valid@example.com");
        assertTrue(jwtTokenProvider.validateToken(token));
    }

    @Test
    void validateToken_InvalidSignature_ReturnsFalse() {
        JwtTokenProvider otherProvider =
                new JwtTokenProvider(
                        "another-very-secure-secret-key-at-least-256-bits-long-for-testing",
                        EXPIRATION_MS);
        String token = otherProvider.generateToken(1L, "user", "user@example.com");

        assertFalse(jwtTokenProvider.validateToken(token));
    }

    @Test
    void validateToken_MalformedToken_ReturnsFalse() {
        assertFalse(jwtTokenProvider.validateToken("not.a.valid.jwt.token"));
        assertFalse(jwtTokenProvider.validateToken("random-string"));
    }

    @Test
    void validateToken_NullOrEmptyToken_ReturnsFalse() {
        assertFalse(jwtTokenProvider.validateToken(null));
        assertFalse(jwtTokenProvider.validateToken(""));
        assertFalse(jwtTokenProvider.validateToken("   "));
    }

    @Test
    void validateToken_ExpiredToken_ReturnsFalse() {
        String expiredToken =
                jwtTokenProvider.generateToken(1L, "expiredUser", "expired@example.com", -1000L);
        assertFalse(jwtTokenProvider.validateToken(expiredToken));
    }
}
