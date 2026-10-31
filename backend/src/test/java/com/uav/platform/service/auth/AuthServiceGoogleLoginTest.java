package com.uav.platform.service.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.dto.record.auth.GoogleIdentity;
import com.uav.platform.dto.request.auth.GoogleLoginRequest;
import com.uav.platform.dto.request.auth.LoginRequest;
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
import com.uav.platform.service.impl.auth.RegistrationOperations;

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
class AuthServiceGoogleLoginTest {

    private static final String EMAIL = "jane.doe@example.com";
    private static final GoogleLoginRequest REQUEST = new GoogleLoginRequest("id-token");

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private AuthSessionLock sessionLock;
    @Mock private GoogleIdTokenService googleVerifier;
    @Mock private AuthOtpService authOtpService;
    @Mock private AuthRateLimitService rateLimiter;
    @Mock private RefreshTokenService refreshTokenService;

    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        lenient()
                .when(sessionLock.lock(any(AppUser.class)))
                .thenAnswer(call -> call.getArgument(0));
        lenient().when(googleVerifier.isEnabled()).thenReturn(true);
        lenient()
                .when(googleVerifier.verify("id-token"))
                .thenReturn(new GoogleIdentity("sub-1", EMAIL, "Jane Doe"));
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
        authService.setGoogleIdTokenService(googleVerifier);
        authService.setAuthOtpService(authOtpService);
        authService.setRateLimiter(rateLimiter);
    }

    private static AppUser user(UserRole role, UserStatus status) {
        AppUser user =
                new AppUser("jane", EMAIL, "hash", "0987654321", null, "Jane", null, role, status);
        user.setId(7L);
        user.setEmailVerified(true);
        return user;
    }

    private void existing(AppUser user) {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
    }

    @Test
    void existingUserWithout2fa_GetsTokens() {
        AppUser user = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        user.setFailedAttempts(3);
        existing(user);

        AuthResponse response = authService.loginWithGoogle(REQUEST);

        assertEquals("access-token", response.accessToken());
        assertFalse(Boolean.TRUE.equals(response.mfaRequired()));
        assertEquals("jane", response.user().username());
        assertEquals(0, user.getFailedAttempts());
        verify(rateLimiter).checkAccount(AuthRateLimitAction.LOGIN, EMAIL);
        verify(sessionLock).lock(user);
        verify(authOtpService, never()).createLoginChallenge(any(), any());
    }

    @Test
    void existingUserFoundIgnoringCase() {
        AppUser user = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        user.setEmail("Jane.Doe@Example.com");
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
        when(userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc(EMAIL))
                .thenReturn(Optional.of(user));

        assertEquals("access-token", authService.loginWithGoogle(REQUEST).accessToken());
        verify(userRepository, never()).existsByUsernameIgnoreCase(anyString());
    }

    @Test
    void existingUserWith2fa_GetsChallengeNotTokens() {
        AppUser user = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        user.setTwoFactorEnabled(true);
        existing(user);
        AuthResponse challenge =
                AuthResponse.challenge("TOTP", "challenge-1", "j***@example.com", null, null);
        when(authOtpService.createLoginChallenge(user, null)).thenReturn(challenge);

        AuthResponse response = authService.loginWithGoogle(REQUEST);

        assertSame(challenge, response);
        assertTrue(response.mfaRequired());
        assertNull(response.accessToken());
        assertEquals("hash", user.getPasswordHash());
        verify(jwtTokenProvider, never()).generateToken(any(), any(), any(), any());
        verify(refreshTokenService, never()).deleteByUser(any());
        verify(refreshTokenService, never()).createRefreshToken(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void verifiedAccount_KeepsItsPasswordAndSessions() {
        AppUser user = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        existing(user);

        AuthResponse response = authService.loginWithGoogle(REQUEST);

        assertEquals("access-token", response.accessToken());
        assertEquals("hash", user.getPasswordHash());
        assertTrue(user.isEmailVerified());
        verify(refreshTokenService, never()).deleteByUser(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void preRegisteredUnverifiedAccount_LosesItsPasswordAndSessions() {
        // Someone registered the address with their own password and never verified it.
        AppUser user = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        user.setEmailVerified(false);
        existing(user);

        AuthResponse response = authService.loginWithGoogle(REQUEST);

        assertTrue(user.isEmailVerified());
        assertNull(user.getPasswordHash());
        assertEquals("access-token", response.accessToken());
        var order = inOrder(userRepository, refreshTokenService);
        order.verify(userRepository).save(user);
        order.verify(refreshTokenService).deleteByUser(user);
        order.verify(refreshTokenService).createRefreshToken(user);
        verify(authOtpService, never()).createLoginChallenge(any(), any());

        // The pre-registered password no longer signs in.
        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () -> authService.login(new LoginRequest(EMAIL, "attacker-password")));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals(CoreConstants.INVALID_CREDENTIALS, ex.getMessage());
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void staffWith2fa_KeepsItsRoleAndGetsAChallenge() {
        for (UserRole role :
                new UserRole[] {
                    UserRole.ROLE_OPERATOR, UserRole.ROLE_COMMANDER, UserRole.ROLE_ADMIN
                }) {
            AppUser user = user(role, UserStatus.ACTIVE);
            user.setTwoFactorEnabled(true);
            existing(user);
            AuthResponse challenge =
                    AuthResponse.challenge("EMAIL", "challenge-" + role, "j***", null, null);
            when(authOtpService.createLoginChallenge(user, null)).thenReturn(challenge);

            assertSame(challenge, authService.loginWithGoogle(REQUEST));
            assertEquals(role, user.getRole());
        }
        verify(userRepository, never()).save(any());
        verify(jwtTokenProvider, never()).generateToken(any(), any(), any(), any());
    }

    @Test
    void staffWithout2fa_IsRejected() {
        for (UserRole role :
                new UserRole[] {
                    UserRole.ROLE_OPERATOR, UserRole.ROLE_COMMANDER, UserRole.ROLE_ADMIN
                }) {
            AppUser user = user(role, UserStatus.ACTIVE);
            user.setEmailVerified(false);
            user.setFailedAttempts(2);
            existing(user);

            SystemException ex =
                    assertThrows(SystemException.class, () -> authService.loginWithGoogle(REQUEST));

            assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
            assertEquals("GOOGLE_STAFF_REQUIRES_2FA", ex.getCode());
            assertEquals(
                    "Tài khoản nhân sự cần bật xác thực 2 lớp để đăng nhập bằng Google. Vui lòng đăng nhập bằng mật khẩu.",
                    ex.getMessage());
            // Nothing about the account changes.
            assertEquals("hash", user.getPasswordHash());
            assertFalse(user.isEmailVerified());
            assertEquals(2, user.getFailedAttempts());
        }
        verify(userRepository, never()).save(any());
        verifyNoInteractions(refreshTokenService, authOtpService);
        verify(jwtTokenProvider, never()).generateToken(any(), any(), any(), any());
    }

    @Test
    void unknownEmail_CreatesVerifiedCustomerWithoutPassword() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
        when(userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc(EMAIL))
                .thenReturn(Optional.empty());
        when(userRepository.existsByUsernameIgnoreCase("jane.doe")).thenReturn(true);
        when(userRepository.existsByUsernameIgnoreCase("jane.doe-2")).thenReturn(false);

        AuthResponse response = authService.loginWithGoogle(REQUEST);

        ArgumentCaptor<AppUser> saved = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(saved.capture());
        AppUser created = saved.getValue();
        assertEquals("jane.doe-2", created.getUsername());
        assertEquals(EMAIL, created.getEmail());
        assertEquals("Jane Doe", created.getFullName());
        assertEquals(UserRole.ROLE_PILOT, created.getRole());
        assertEquals(UserStatus.ACTIVE, created.getStatus());
        assertTrue(created.isEmailVerified());
        assertFalse(created.isTwoFactorEnabled());
        assertNull(created.getPasswordHash());
        assertNull(created.getPhoneNumber());
        assertEquals("access-token", response.accessToken());
        verify(rateLimiter).checkAccount(AuthRateLimitAction.LOGIN, EMAIL);
    }

    @Test
    void usernameFromEmail_IsSanitisedAndAvoidsReservedNames() {
        assertEquals("jane.doe", RegistrationOperations.usernameFromEmail("Jane.Doe@x.com"));
        assertEquals("johntag", RegistrationOperations.usernameFromEmail("john+tag@x.com"));
        assertEquals("user-admin", RegistrationOperations.usernameFromEmail("admin@x.com"));
        assertEquals("user-ab", RegistrationOperations.usernameFromEmail("ab@x.com"));
        assertEquals("user", RegistrationOperations.usernameFromEmail("+++@x.com"));
        assertEquals(
                40, RegistrationOperations.usernameFromEmail("a".repeat(64) + "@x.com").length());
    }

    @Test
    void googleCreatedAccount_CannotSignInWithAPassword() {
        AppUser created = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        created.setPasswordHash(null);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(created));

        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () -> authService.login(new LoginRequest(EMAIL, "anything")));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals(CoreConstants.INVALID_CREDENTIALS, ex.getMessage());
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void inactiveAccount_IsRejected() {
        existing(user(UserRole.ROLE_PILOT, UserStatus.INACTIVE));

        SystemException ex =
                assertThrows(SystemException.class, () -> authService.loginWithGoogle(REQUEST));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals(CoreConstants.ACCOUNT_INACTIVE, ex.getMessage());
        verify(jwtTokenProvider, never()).generateToken(any(), any(), any(), any());
    }

    @Test
    void lockedAccount_IsRejected() {
        AppUser user = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        user.setManualLocked(true);
        existing(user);

        SystemException ex =
                assertThrows(SystemException.class, () -> authService.loginWithGoogle(REQUEST));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        verify(jwtTokenProvider, never()).generateToken(any(), any(), any(), any());
    }

    @Test
    void operatorAwaitingApproval_IsRejected() {
        existing(user(UserRole.ROLE_OPERATOR, UserStatus.INACTIVE));

        SystemException ex =
                assertThrows(SystemException.class, () -> authService.loginWithGoogle(REQUEST));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("ACCOUNT_PENDING_APPROVAL", ex.getCode());
    }

    @Test
    void invalidToken_StopsBeforeAnyLookup() {
        when(googleVerifier.verify("id-token"))
                .thenThrow(
                        SystemException.unauthorized(
                                GoogleIdTokenService.INVALID_MESSAGE,
                                GoogleIdTokenService.INVALID_CODE));

        SystemException ex =
                assertThrows(SystemException.class, () -> authService.loginWithGoogle(REQUEST));

        assertEquals(GoogleIdTokenService.INVALID_CODE, ex.getCode());
        verifyNoInteractions(userRepository);
        verify(rateLimiter, never()).checkAccount(any(), any());
    }

    @Test
    void emptyConfig_Returns503() {
        when(googleVerifier.isEnabled()).thenReturn(false);

        SystemException ex =
                assertThrows(SystemException.class, () -> authService.loginWithGoogle(REQUEST));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertEquals(GoogleIdTokenService.DISABLED_CODE, ex.getCode());
        assertEquals(GoogleIdTokenService.DISABLED_MESSAGE, ex.getMessage());
        verify(googleVerifier, never()).verify(any());
        verifyNoInteractions(userRepository);
    }

    @Test
    void rateLimitedEmail_IsRejectedBeforeLookup() {
        doThrow(new SystemException("Too many", HttpStatus.TOO_MANY_REQUESTS, "AUTH_RATE_LIMITED"))
                .when(rateLimiter)
                .checkAccount(eq(AuthRateLimitAction.LOGIN), eq(EMAIL));

        SystemException ex =
                assertThrows(SystemException.class, () -> authService.loginWithGoogle(REQUEST));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        verifyNoInteractions(userRepository);
    }
}
