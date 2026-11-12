package com.uav.platform.service.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.security.SecuritySessionQueryRequest;
import com.uav.platform.dto.request.security.TwoFactorResetRequest;
import com.uav.platform.entity.auth.AuthOtpToken;
import com.uav.platform.entity.auth.RefreshToken;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.auth.AuthOtpTokenRepository;
import com.uav.platform.repository.auth.RefreshTokenRepository;
import com.uav.platform.repository.security.SessionRevocationRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.auth.AuthSessionLock;
import com.uav.platform.service.impl.security.SecuritySessionServiceImpl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

class SecuritySessionServiceImplTest {

    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenRepository refreshTokens = mock(RefreshTokenRepository.class);
    private final AuthOtpTokenRepository otpTokens = mock(AuthOtpTokenRepository.class);
    private final SessionRevocationRepository revocations = mock(SessionRevocationRepository.class);
    private final SessionRevocationService revocationService = mock(SessionRevocationService.class);
    private final AuthSessionLock lock = mock(AuthSessionLock.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final SecuritySessionServiceImpl service =
            new SecuritySessionServiceImpl(
                    users, refreshTokens, otpTokens, revocations, revocationService, lock, audit);
    private final Authentication admin = new UsernamePasswordAuthenticationToken("admin", null);
    private final Instant cutoff = Instant.parse("2026-10-25T10:00:00Z");
    private AppUser adminUser;
    private AppUser pilot;

    private static AppUser user(long id, String username) {
        AppUser u = new AppUser();
        u.setId(id);
        u.setUsername(username);
        u.setEmail(username + "@uav.vn");
        u.setRole(UserRole.ROLE_PILOT);
        return u;
    }

    @BeforeEach
    void setUp() {
        adminUser = user(1L, "admin");
        pilot = user(2L, "pilot");
        when(users.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(users.findById(2L)).thenReturn(Optional.of(pilot));
        when(users.findById(1L)).thenReturn(Optional.of(adminUser));
        when(lock.lock(any())).thenAnswer(i -> i.getArgument(0));
        when(revocationService.revokeAccessTokens(anyCollection(), anyString())).thenReturn(cutoff);
        when(otpTokens.findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(anyString(), anyString()))
                .thenReturn(List.of());
    }

    @Test
    void revokeUserSessionsRevokesRefreshAccessAndPendingChallengesAndAudits() {
        when(refreshTokens.revokeByUserId(2L)).thenReturn(1);
        AuthOtpToken challenge = new AuthOtpToken();
        when(otpTokens.findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(
                        "pilot@uav.vn", "LOGIN_2FA"))
                .thenReturn(List.of(challenge));

        var result = service.revokeUserSessions(2L, admin);

        verify(lock).lock(pilot);
        verify(refreshTokens).revokeByUserId(2L);
        verify(revocationService).revokeAccessTokens(List.of(2L), "admin");
        assertNotNull(challenge.getConsumedAt(), "pending login 2FA challenge is cancelled");
        verify(audit)
                .record(
                        eq(1L),
                        eq("admin"),
                        eq(AuditAction.REVOKE),
                        eq("USER_SESSION"),
                        eq("2"),
                        contains("refreshTokensRevoked=1"));
        assertEquals(1, result.refreshTokensRevoked());
        assertEquals(cutoff, result.effectiveAt());
        assertFalse(result.includesCurrentUser());
    }

    @Test
    void revokingOwnSessionsIsAllowedAndFlagged() {
        var result = service.revokeUserSessions(1L, admin);
        assertTrue(result.includesCurrentUser());
        verify(refreshTokens).revokeByUserId(1L);
    }

    @Test
    void unknownUserIsNotFoundAndNothingIsRevoked() {
        when(users.findById(99L)).thenReturn(Optional.empty());
        assertThrows(SystemException.class, () -> service.revokeUserSessions(99L, admin));
        verifyNoInteractions(refreshTokens, revocationService, audit);
    }

    @Test
    void revokeAllSkipsTheCallingAdmin() {
        when(refreshTokens.revokeAllExceptUserId(1L)).thenReturn(3);
        when(revocations.findAllUserIdsExcept(1L)).thenReturn(List.of(2L, 3L, 4L));
        when(users.findAllById(List.of(2L, 3L, 4L))).thenReturn(List.of(pilot));

        var result = service.revokeAllSessions(admin);

        verify(refreshTokens).revokeAllExceptUserId(1L);
        verify(revocationService).revokeAccessTokens(List.of(2L, 3L, 4L), "admin");
        verify(refreshTokens, never()).revokeByUserId(1L);
        verify(audit)
                .record(
                        eq(1L),
                        eq("admin"),
                        eq(AuditAction.REVOKE),
                        eq("USER_SESSION"),
                        eq("ALL"),
                        contains("users=3"));
        assertEquals(3, result.affectedUsers());
        assertEquals(3, result.refreshTokensRevoked());
        assertFalse(result.includesCurrentUser());
    }

    @Test
    void resetTwoFactorClearsAuthenticatorSecretRevokesByDefaultAndNeverAuditsTheSecret() {
        pilot.setTwoFactorEnabled(true);
        pilot.setTwoFactorMethod("TOTP");
        pilot.setTotpSecret("JBSWY3DPEHPK3PXPSECRETVALUE");

        var result = service.resetTwoFactor(2L, null, admin);

        assertFalse(pilot.isTwoFactorEnabled());
        assertEquals("EMAIL", pilot.getTwoFactorMethod());
        assertNull(pilot.getTotpSecret());
        verify(users).save(pilot);
        verify(refreshTokens).revokeByUserId(2L);
        verify(audit)
                .record(
                        eq(1L),
                        eq("admin"),
                        eq(AuditAction.UPDATE),
                        eq("USER_2FA"),
                        eq("2"),
                        argThat(
                                d ->
                                        d.contains("previousMethod=TOTP")
                                                && d.contains("sessionsRevoked=true")
                                                && !d.contains("JBSWY3DP")));
        assertEquals("RESET_2FA", result.action());
    }

    @Test
    void resetTwoFactorCanKeepSessions() {
        pilot.setTwoFactorEnabled(true);
        service.resetTwoFactor(2L, new TwoFactorResetRequest(false), admin);
        assertFalse(pilot.isTwoFactorEnabled());
        verify(refreshTokens, never()).revokeByUserId(anyLong());
        verify(revocationService, never()).revokeAccessTokens(anyCollection(), anyString());
    }

    @Test
    @SuppressWarnings("unchecked")
    void sessionListReportsTokenStateWithoutTokenValues() {
        pilot.setTwoFactorEnabled(true);
        pilot.setTwoFactorMethod("TOTP");
        Page<AppUser> page = new PageImpl<>(List.of(pilot, adminUser));
        when(users.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        RefreshToken active =
                new RefreshToken(
                        pilot, "secret-refresh-token-value", Instant.now().plusSeconds(3600));
        RefreshToken revoked =
                new RefreshToken(adminUser, "other-token-value", Instant.now().plusSeconds(3600));
        revoked.setRevoked(true);
        when(refreshTokens.findByUserIdIn(List.of(2L, 1L))).thenReturn(List.of(active, revoked));
        when(revocations.findAllById(List.of(2L, 1L))).thenReturn(List.of());

        var result = service.sessions(new SecuritySessionQueryRequest(0, 500, "p", null, false));

        assertEquals(2, result.content().size());
        var first = result.content().get(0);
        assertTrue(first.activeSession());
        assertEquals("ACTIVE", first.sessionState());
        assertTrue(first.twoFactorEnabled());
        assertEquals("TOTP", first.twoFactorMethod());
        assertEquals("REVOKED", result.content().get(1).sessionState());
        assertFalse(result.toString().contains("secret-refresh-token-value"));
    }
}
