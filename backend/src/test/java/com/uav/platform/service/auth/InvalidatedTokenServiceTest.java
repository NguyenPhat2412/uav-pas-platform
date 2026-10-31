package com.uav.platform.service.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.entity.auth.InvalidatedToken;
import com.uav.platform.repository.auth.InvalidatedTokenRepository;
import com.uav.platform.security.jwt.JwtTokenProvider;
import com.uav.platform.service.impl.auth.InvalidatedTokenServiceImpl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Date;

@ExtendWith(MockitoExtension.class)
@DisplayName("InvalidatedTokenService Unit Tests")
class InvalidatedTokenServiceTest {

    @Mock private InvalidatedTokenRepository invalidatedTokenRepository;

    @Mock private JwtTokenProvider jwtTokenProvider;

    private InvalidatedTokenService invalidatedTokenService;

    @BeforeEach
    void setUp() {
        invalidatedTokenService =
                new InvalidatedTokenServiceImpl(invalidatedTokenRepository, jwtTokenProvider);
    }

    @Test
    @DisplayName("invalidate should extract token ID and persist in blacklist")
    void invalidate_Success() {
        String token = "sample-jwt-token";
        when(jwtTokenProvider.getTokenIdFromToken(token)).thenReturn("jti-12345");
        when(jwtTokenProvider.getExpirationFromToken(token))
                .thenReturn(new Date(System.currentTimeMillis() + 3600000));
        when(invalidatedTokenRepository.existsByTokenId("jti-12345")).thenReturn(false);

        invalidatedTokenService.invalidate(token);

        verify(invalidatedTokenRepository).save(any(InvalidatedToken.class));
    }

    @Test
    @DisplayName("isInvalidated should return true if token is found in repository")
    void isInvalidated_ChecksRepository() {
        String token = "blacklisted-token";
        when(jwtTokenProvider.getTokenIdFromToken(token)).thenReturn("jti-999");
        when(invalidatedTokenRepository.existsByTokenId("jti-999")).thenReturn(true);

        assertTrue(invalidatedTokenService.isInvalidated(token));
    }

    @Test
    @DisplayName("purgeExpiredTokens should call repository deleteExpiredTokens")
    void purgeExpiredTokens_Success() {
        when(invalidatedTokenRepository.deleteExpiredTokens(any())).thenReturn(5);

        invalidatedTokenService.purgeExpiredTokens();

        verify(invalidatedTokenRepository).deleteExpiredTokens(any());
    }
}
