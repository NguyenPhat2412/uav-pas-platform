package com.uav.platform.modules.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.dto.record.GoogleIdentity;
import com.uav.platform.modules.auth.dto.request.GoogleLoginRequest;
import com.uav.platform.modules.auth.dto.request.LoginRequest;
import com.uav.platform.modules.auth.dto.response.AuthResponse;
import com.uav.platform.modules.auth.enums.AuthRateLimitAction;
import com.uav.platform.modules.auth.service.impl.AuthServiceImpl;
import com.uav.platform.modules.auth.service.impl.RegistrationOperations;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.security.jwt.JwtTokenProvider;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

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
        authService =
                new AuthServiceImpl(
                        userRepository, passwordEncoder, jwtTokenProvider, null, null, sessionLock);
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
        verify(jwtTokenProvider, never()).generateToken(any(), any(), any(), any());
    }

    @Test
    void existingUnverifiedEmail_IsMarkedVerifiedAndSignedIn() {
        AppUser user = user(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        user.setEmailVerified(false);
        existing(user);

        AuthResponse response = authService.loginWithGoogle(REQUEST);

        assertTrue(user.isEmailVerified());
        assertEquals("access-token", response.accessToken());
        verify(userRepository).save(user);
        verify(authOtpService, never()).createLoginChallenge(any(), any());
    }

    @Test
    void existingStaffKeepsItsRole() {
        AppUser user = user(UserRole.ROLE_OPERATOR, UserStatus.ACTIVE);
        existing(user);

        authService.loginWithGoogle(REQUEST);

        assertEquals(UserRole.ROLE_OPERATOR, user.getRole());
        verify(userRepository, never()).save(any());
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
