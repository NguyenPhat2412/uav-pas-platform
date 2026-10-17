package com.uav.platform.modules.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.entity.RefreshToken;
import com.uav.platform.modules.auth.repository.RefreshTokenRepository;
import com.uav.platform.modules.auth.service.impl.RefreshTokenServiceImpl;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.security.jwt.JwtTokenProvider;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefreshTokenService Unit Tests")
class RefreshTokenServiceTest {

    @Mock private RefreshTokenRepository refreshTokenRepository;

    @Mock private JwtTokenProvider jwtTokenProvider;

    @Mock private AuthSessionLock sessionLock;
    @Mock private jakarta.persistence.EntityManager entityManager;

    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        lenient().when(sessionLock.lock(any(AppUser.class))).thenAnswer(i -> i.getArgument(0));
        refreshTokenService =
                new RefreshTokenServiceImpl(
                        refreshTokenRepository, jwtTokenProvider, sessionLock, entityManager);
    }

    @Test
    @DisplayName("createRefreshToken should delete existing tokens and persist new one")
    void createRefreshToken_Success() {
        AppUser user = new AppUser("user1", "u1@uav.vn", "h", "0900000001", UserStatus.ACTIVE);
        when(jwtTokenProvider.getRefreshExpirationMs()).thenReturn(604800000L);
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        RefreshToken token = refreshTokenService.createRefreshToken(user);

        assertNotNull(token);
        assertNotNull(token.getToken());
        assertEquals(user, token.getUser());
        verify(refreshTokenRepository).deleteByUser(user);
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("verifyExpiration should pass for valid token")
    void verifyExpiration_ValidToken() {
        AppUser user = new AppUser("user2", "u2@uav.vn", "h", "0900000002", UserStatus.ACTIVE);
        RefreshToken token =
                new RefreshToken(user, "tok-valid", Instant.now().plus(1, ChronoUnit.DAYS));

        RefreshToken verified = refreshTokenService.verifyExpiration(token);
        assertEquals(token, verified);
    }

    @Test
    @DisplayName("verifyExpiration should throw SystemException when token is expired")
    void verifyExpiration_ExpiredToken_Throws() {
        AppUser user = new AppUser("user3", "u3@uav.vn", "h", "0900000003", UserStatus.ACTIVE);
        RefreshToken expired =
                new RefreshToken(user, "tok-expired", Instant.now().minus(1, ChronoUnit.DAYS));

        assertThrows(SystemException.class, () -> refreshTokenService.verifyExpiration(expired));
        verify(refreshTokenRepository).delete(expired);
    }

    @Test
    @DisplayName("revokeToken should set revoked = true")
    void revokeToken_Success() {
        AppUser user = new AppUser("user4", "u4@uav.vn", "h", "0900000004", UserStatus.ACTIVE);
        RefreshToken token =
                new RefreshToken(user, "tok-revoke", Instant.now().plus(1, ChronoUnit.DAYS));
        user.setId(4L);
        when(refreshTokenRepository.findUserIdByToken("tok-revoke")).thenReturn(Optional.of(4L));
        when(sessionLock.lockById(4L)).thenReturn(Optional.of(user));
        when(refreshTokenRepository.findByTokenForUpdate("tok-revoke"))
                .thenReturn(Optional.of(token));

        refreshTokenService.revokeToken("tok-revoke");

        assertTrue(token.isRevoked());
        verify(refreshTokenRepository).save(token);
    }

    @Test
    void verifyExpiration_RevokedTokenIsDeletedEvenBeforeExpiry() {
        RefreshToken revoked =
                new RefreshToken(new AppUser(), "revoked", Instant.now().plusSeconds(60));
        revoked.setRevoked(true);

        assertThrows(SystemException.class, () -> refreshTokenService.verifyExpiration(revoked));

        verify(refreshTokenRepository).delete(revoked);
    }

    @Test
    void verifyExpiration_MissingTokenRejectsWithoutDeleting() {
        assertThrows(SystemException.class, () -> refreshTokenService.verifyExpiration(null));
        verifyNoInteractions(refreshTokenRepository);
    }
}
