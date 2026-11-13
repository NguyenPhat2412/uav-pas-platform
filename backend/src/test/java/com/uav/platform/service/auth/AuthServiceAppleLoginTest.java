package com.uav.platform.service.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.record.auth.AppleIdentity;
import com.uav.platform.dto.request.auth.AppleLoginRequest;
import com.uav.platform.dto.response.auth.AuthResponse;
import com.uav.platform.entity.auth.RefreshToken;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.auth.AuthRateLimitAction;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.security.jwt.JwtTokenProvider;
import com.uav.platform.service.impl.auth.AuthServiceImpl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class AuthServiceAppleLoginTest {

    private static final String APPLE_SUB = "001234.apple_sub_abc123.0912";
    private static final String EMAIL = "pilot.apple@privaterelay.appleid.com";

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private AuthSessionLock sessionLock;
    @Mock private AppleIdTokenService appleVerifier;
    @Mock private AuthOtpService authOtpService;
    @Mock private AuthRateLimitService rateLimiter;
    @Mock private RefreshTokenService refreshTokenService;

    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        lenient()
                .when(sessionLock.lock(any(AppUser.class)))
                .thenAnswer(call -> call.getArgument(0));
        lenient().when(appleVerifier.isEnabled()).thenReturn(true);
        lenient()
                .when(userRepository.save(any(AppUser.class)))
                .thenAnswer(call -> call.getArgument(0));
        lenient()
                .when(jwtTokenProvider.generateToken(any(), anyString(), anyString(), anyString()))
                .thenReturn("access-token");
        lenient()
                .when(refreshTokenService.createRefreshToken(any(AppUser.class)))
                .thenAnswer(
                        call ->
                                new RefreshToken(
                                        call.getArgument(0),
                                        "refresh-token",
                                        Instant.now().plusSeconds(60)));
        authService =
                new AuthServiceImpl(
                        userRepository,
                        passwordEncoder,
                        jwtTokenProvider,
                        refreshTokenService,
                        null,
                        sessionLock);
        authService.setAppleIdTokenService(appleVerifier);
        authService.setAuthOtpService(authOtpService);
        authService.setRateLimiter(rateLimiter);
    }

    private static AppUser user(UserRole role, UserStatus status) {
        AppUser user =
                new AppUser(
                        "applepilot",
                        EMAIL,
                        "hash",
                        "0987654321",
                        "Nguyễn Văn A",
                        null,
                        role,
                        status);
        user.setId(15L);
        user.setEmailVerified(true);
        return user;
    }

    @Test
    void firstTimeAppleLogin_CreatesVerifiedPilotCustomerWithAppleSubAndFullName() {
        AppleLoginRequest req =
                new AppleLoginRequest("apple-jwt", "auth-code", "  Trần Minh Quân  ", "nonce-1");
        when(appleVerifier.verify("apple-jwt", "nonce-1"))
                .thenReturn(new AppleIdentity(APPLE_SUB, EMAIL, true));
        when(userRepository.findByAppleSub(APPLE_SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
        when(userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc(EMAIL))
                .thenReturn(Optional.empty());
        when(userRepository.existsByUsernameIgnoreCase("pilot.apple")).thenReturn(false);

        AuthResponse response = authService.loginWithApple(req);

        ArgumentCaptor<AppUser> saved = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(saved.capture());
        AppUser created = saved.getValue();
        assertEquals("pilot.apple", created.getUsername());
        assertEquals(EMAIL, created.getEmail());
        assertEquals(APPLE_SUB, created.getAppleSub());
        assertEquals("Trần Minh Quân", created.getFullName());
        assertEquals(UserRole.ROLE_PILOT, created.getRole());
        assertEquals(UserStatus.ACTIVE, created.getStatus());
        assertTrue(created.isEmailVerified());
        assertFalse(created.isTwoFactorEnabled());
        assertNull(created.getPasswordHash());
        assertEquals("access-token", response.accessToken());
        verify(rateLimiter).checkAccount(AuthRateLimitAction.LOGIN, EMAIL);
    }

    @Test
    void returningAppleLogin_FindsByAppleSubEvenWhenAppleOmitsEmailAndBackfillsBlankNameOnly() {
        AppUser existing = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        existing.setAppleSub(APPLE_SUB);
        existing.setFullName(null);
        existing.setFailedAttempts(2);
        when(appleVerifier.verify("apple-jwt-2", null))
                .thenReturn(new AppleIdentity(APPLE_SUB, null, false));
        when(userRepository.findByAppleSub(APPLE_SUB)).thenReturn(Optional.of(existing));

        AuthResponse response =
                authService.loginWithApple(
                        new AppleLoginRequest("apple-jwt-2", null, "Lê Thị Mai", null));

        assertEquals("access-token", response.accessToken());
        assertEquals("Lê Thị Mai", existing.getFullName());
        assertEquals(0, existing.getFailedAttempts());
        verify(rateLimiter).checkAccount(AuthRateLimitAction.LOGIN, "apple:" + APPLE_SUB);
        verify(userRepository, never()).findByEmail(anyString());
        verify(userRepository).save(existing);

        // Subsequent login with another name does NOT overwrite non-blank fullName.
        AuthResponse second =
                authService.loginWithApple(
                        new AppleLoginRequest("apple-jwt-2", null, "Tên Khác", null));
        assertEquals("access-token", second.accessToken());
        assertEquals("Lê Thị Mai", existing.getFullName());
    }

    @Test
    void firstTimeAppleLoginWithoutEmail_ThrowsAppleEmailRequired() {
        when(appleVerifier.verify("apple-jwt", null))
                .thenReturn(new AppleIdentity(APPLE_SUB, null, false));
        when(userRepository.findByAppleSub(APPLE_SUB)).thenReturn(Optional.empty());

        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () ->
                                authService.loginWithApple(
                                        new AppleLoginRequest("apple-jwt", null, null, null)));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("APPLE_EMAIL_REQUIRED", ex.getCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    void existingEmailAccount_BindsAppleSubAndPreservesVerifiedPassword() {
        AppUser existing = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        assertNull(existing.getAppleSub());
        when(appleVerifier.verify("apple-jwt", null))
                .thenReturn(new AppleIdentity(APPLE_SUB, EMAIL, true));
        when(userRepository.findByAppleSub(APPLE_SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(existing));

        AuthResponse response =
                authService.loginWithApple(
                        new AppleLoginRequest("apple-jwt", null, "Ignored Name", null));

        assertEquals("access-token", response.accessToken());
        assertEquals(APPLE_SUB, existing.getAppleSub());
        assertEquals("Nguyễn Văn A", existing.getFullName());
        assertEquals("hash", existing.getPasswordHash());
        verify(userRepository).save(existing);
    }

    @Test
    void existingEmailBoundToDifferentAppleSub_Throws409Conflict() {
        AppUser existing = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        existing.setAppleSub("other-apple-sub-999");
        when(appleVerifier.verify("apple-jwt", null))
                .thenReturn(new AppleIdentity(APPLE_SUB, EMAIL, true));
        when(userRepository.findByAppleSub(APPLE_SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(existing));

        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () ->
                                authService.loginWithApple(
                                        new AppleLoginRequest("apple-jwt", null, null, null)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("APPLE_ACCOUNT_CONFLICT", ex.getCode());
        assertEquals("other-apple-sub-999", existing.getAppleSub());
        verify(userRepository, never()).save(any());
        verify(jwtTokenProvider, never()).generateToken(any(), any(), any(), any());
    }

    @Test
    void preRegisteredUnverifiedCustomer_DropsSquatterPasswordAndBindsAppleSub() {
        AppUser squatted = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        squatted.setEmailVerified(false);
        when(appleVerifier.verify("apple-jwt", null))
                .thenReturn(new AppleIdentity(APPLE_SUB, EMAIL, true));
        when(userRepository.findByAppleSub(APPLE_SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(squatted));

        AuthResponse response =
                authService.loginWithApple(new AppleLoginRequest("apple-jwt", null, null, null));

        assertEquals("access-token", response.accessToken());
        assertEquals(APPLE_SUB, squatted.getAppleSub());
        assertTrue(squatted.isEmailVerified());
        assertNull(squatted.getPasswordHash());
        verify(refreshTokenService).deleteByUser(squatted);
    }

    @Test
    void existingUserWith2fa_GetsChallengeAndNeverBypasses2fa() {
        AppUser existing = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        existing.setAppleSub(APPLE_SUB);
        existing.setTwoFactorEnabled(true);
        when(appleVerifier.verify("apple-jwt", null))
                .thenReturn(new AppleIdentity(APPLE_SUB, null, false));
        when(userRepository.findByAppleSub(APPLE_SUB)).thenReturn(Optional.of(existing));
        AuthResponse challenge =
                AuthResponse.challenge("TOTP", "challenge-apple", "p***@appleid.com", null, null);
        when(authOtpService.createLoginChallenge(existing, null)).thenReturn(challenge);

        AuthResponse response =
                authService.loginWithApple(new AppleLoginRequest("apple-jwt", null, null, null));

        assertSame(challenge, response);
        assertTrue(response.mfaRequired());
        assertNull(response.accessToken());
        verify(jwtTokenProvider, never()).generateToken(any(), any(), any(), any());
    }

    @Test
    void disabledLockedPendingAndInactiveAccounts_AreRejected() {
        when(appleVerifier.isEnabled()).thenReturn(false);
        SystemException disabled =
                assertThrows(
                        SystemException.class,
                        () ->
                                authService.loginWithApple(
                                        new AppleLoginRequest("apple-jwt", null, null, null)));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, disabled.getStatus());
        assertEquals(AppleIdTokenService.DISABLED_CODE, disabled.getCode());

        when(appleVerifier.isEnabled()).thenReturn(true);
        when(appleVerifier.verify("apple-jwt", null))
                .thenReturn(new AppleIdentity(APPLE_SUB, EMAIL, true));

        AppUser locked = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        locked.setAppleSub(APPLE_SUB);
        locked.setManualLocked(true);
        when(userRepository.findByAppleSub(APPLE_SUB)).thenReturn(Optional.of(locked));
        assertEquals(
                HttpStatus.UNAUTHORIZED,
                assertThrows(
                                SystemException.class,
                                () ->
                                        authService.loginWithApple(
                                                new AppleLoginRequest(
                                                        "apple-jwt", null, null, null)))
                        .getStatus());

        AppUser pendingOp = user(UserRole.ROLE_OPERATOR, UserStatus.INACTIVE);
        pendingOp.setAppleSub(APPLE_SUB);
        when(userRepository.findByAppleSub(APPLE_SUB)).thenReturn(Optional.of(pendingOp));
        SystemException pendingEx =
                assertThrows(
                        SystemException.class,
                        () ->
                                authService.loginWithApple(
                                        new AppleLoginRequest("apple-jwt", null, null, null)));
        assertEquals(HttpStatus.FORBIDDEN, pendingEx.getStatus());
        assertEquals("ACCOUNT_PENDING_APPROVAL", pendingEx.getCode());

        AppUser inactive = user(UserRole.ROLE_PILOT, UserStatus.INACTIVE);
        inactive.setAppleSub(APPLE_SUB);
        when(userRepository.findByAppleSub(APPLE_SUB)).thenReturn(Optional.of(inactive));
        assertEquals(
                HttpStatus.BAD_REQUEST,
                assertThrows(
                                SystemException.class,
                                () ->
                                        authService.loginWithApple(
                                                new AppleLoginRequest(
                                                        "apple-jwt", null, null, null)))
                        .getStatus());
    }
}
