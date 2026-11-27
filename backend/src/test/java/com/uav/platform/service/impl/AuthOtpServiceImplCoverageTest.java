package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.dao.IAuthOtpTokenDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.request.ForgotPasswordRequest;
import com.uav.platform.dto.request.RegisterRequest;
import com.uav.platform.dto.request.ResendOtpRequest;
import com.uav.platform.dto.request.ResetPasswordRequest;
import com.uav.platform.dto.request.TwoFactorDisableRequest;
import com.uav.platform.dto.request.TwoFactorSetupRequest;
import com.uav.platform.dto.request.TwoFactorVerifyRequest;
import com.uav.platform.dto.request.VerifyOtpRequest;
import com.uav.platform.dto.response.AuthResponse;
import com.uav.platform.dto.response.OtpChallengeResponse;
import com.uav.platform.dto.response.TwoFactorSetupResponse;
import com.uav.platform.dto.response.TwoFactorStatusResponse;
import com.uav.platform.dto.response.UserResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.AuthOtpToken;
import com.uav.platform.entity.RefreshToken;
import com.uav.platform.enums.UserRole;
import com.uav.platform.enums.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.AuthMapper;
import com.uav.platform.mapper.UserMapper;
import com.uav.platform.security.JwtTokenProvider;
import com.uav.platform.service.AuthMailService;
import com.uav.platform.service.AuthRateLimitService;
import com.uav.platform.service.AuthSessionLock;
import com.uav.platform.service.EmailDomainPolicyService;
import com.uav.platform.service.MailOtpSettingsService;
import com.uav.platform.service.RefreshTokenService;
import com.uav.platform.service.SessionTerminationService;
import com.uav.platform.service.TotpService;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;

class AuthOtpServiceImplCoverageTest {

    private IUserDao userRepository;
    private IAuthOtpTokenDao otpTokenRepository;
    private PasswordEncoder passwordEncoder;
    private JwtTokenProvider jwtTokenProvider;
    private RefreshTokenService refreshTokenService;
    private AuthMailService authMailService;
    private TotpService totpService;
    private AuthMapper authMapper;
    private UserMapper userMapper;
    private AuthRateLimitService rateLimiter;
    private EmailDomainPolicyService emailDomainPolicy;
    private SessionTerminationService sessionTermination;
    private AuthSessionLock sessionLock;
    private MailOtpSettingsService mailOtpSettings;
    private AuthOtpServiceImpl service;

    @BeforeEach
    void setUp() {
        userRepository = mock(IUserDao.class);
        otpTokenRepository = mock(IAuthOtpTokenDao.class);
        passwordEncoder = mock(PasswordEncoder.class);
        jwtTokenProvider = mock(JwtTokenProvider.class);
        refreshTokenService = mock(RefreshTokenService.class);
        authMailService = mock(AuthMailService.class);
        totpService = mock(TotpService.class);
        authMapper = mock(AuthMapper.class);
        userMapper = mock(UserMapper.class);
        rateLimiter = mock(AuthRateLimitService.class);
        emailDomainPolicy = mock(EmailDomainPolicyService.class);
        sessionTermination = mock(SessionTerminationService.class);
        sessionLock = mock(AuthSessionLock.class);
        mailOtpSettings = mock(MailOtpSettingsService.class);

        when(mailOtpSettings.effectiveOtpTtlMinutes()).thenReturn(15);
        when(mailOtpSettings.effectiveMaxOtpAttempts()).thenReturn(5);
        when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "ENC:" + inv.getArgument(0));
        when(otpTokenRepository.save(any(AuthOtpToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));
        when(sessionLock.lock(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userMapper.toResponse(any(AppUser.class))).thenReturn(mock(UserResponse.class));
        when(jwtTokenProvider.generateToken(any(), any(), any(), any())).thenReturn("jwt-token");
        RefreshToken rt = new RefreshToken();
        rt.setToken("refresh-token");
        when(refreshTokenService.createRefreshToken(any(AppUser.class))).thenReturn(rt);
        when(authMapper.toResponse(anyString(), any(), any()))
                .thenReturn(
                        new AuthResponse(
                                "jwt-token",
                                "refresh-token",
                                "Bearer",
                                mock(UserResponse.class),
                                false,
                                null,
                                null,
                                null,
                                null));

        service =
                new AuthOtpServiceImpl(
                        userRepository,
                        otpTokenRepository,
                        passwordEncoder,
                        jwtTokenProvider,
                        refreshTokenService,
                        authMailService,
                        totpService,
                        authMapper,
                        userMapper,
                        0);
        service.setRateLimiter(rateLimiter);
        service.setEmailDomainPolicy(emailDomainPolicy);
        service.setSessionTermination(sessionTermination);
        service.setSessionLock(sessionLock);
        service.setMailOtpSettings(mailOtpSettings);
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    private static AppUser user(
            Long id, String username, String email, UserRole role, UserStatus status) {
        AppUser u = new AppUser();
        u.setId(id);
        u.setUsername(username);
        u.setEmail(email);
        u.setPhoneNumber("0912345678");
        u.setPasswordHash("ENC:Secret123!");
        u.setRole(role);
        u.setStatus(status);
        u.setEmailVerified(true);
        u.setTwoFactorMethod(AuthOtpServiceImpl.METHOD_EMAIL);
        return u;
    }

    private static AuthOtpToken activeToken(AppUser u, String purpose, String codeHash) {
        AuthOtpToken t = new AuthOtpToken();
        t.setUser(u);
        t.setEmail(u != null ? u.getEmail() : "nobody@uav.vn");
        t.setPurpose(purpose);
        t.setCodeHash(codeHash);
        t.setChallengeToken("chal-1");
        t.setAttempts(0);
        t.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        return t;
    }

    @Test
    void requestRegisterOtpCoversNewSignupRestartAndAllConflicts() {
        RegisterRequest req =
                new RegisterRequest("pilot1", "pilot1@uav.vn", "Secret123!", "0912345678");

        // 1. Existing verified email -> conflict
        AppUser verified =
                user(1L, "pilot1", "pilot1@uav.vn", UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        when(userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc("pilot1@uav.vn"))
                .thenReturn(Optional.of(verified));
        assertThrows(SystemException.class, () -> service.requestRegisterOtp(req));

        // 2. Existing unverified email: username conflict, phone conflict, then restart success
        AppUser unverified =
                user(2L, "oldname", "pilot1@uav.vn", UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        unverified.setEmailVerified(false);
        unverified.setPhoneNumber("0988111222");
        when(userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc("pilot1@uav.vn"))
                .thenReturn(Optional.of(unverified));

        when(userRepository.existsByUsernameIgnoreCase("pilot1")).thenReturn(true);
        assertThrows(SystemException.class, () -> service.requestRegisterOtp(req));

        when(userRepository.existsByUsernameIgnoreCase("pilot1")).thenReturn(false);
        when(userRepository.existsByPhoneNumber("0912345678")).thenReturn(true);
        assertThrows(SystemException.class, () -> service.requestRegisterOtp(req));

        when(userRepository.existsByPhoneNumber("0912345678")).thenReturn(false);
        AuthOtpToken oldTok =
                activeToken(unverified, AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY, "h");
        when(otpTokenRepository.findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(
                        "pilot1@uav.vn", AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY))
                .thenReturn(List.of(oldTok));
        when(authMailService.revealsOtp()).thenReturn(true);

        OtpChallengeResponse restarted = service.requestRegisterOtp(req);
        assertNotNull(restarted.devOtpPreview());
        assertNotNull(oldTok.getConsumedAt());
        verify(otpTokenRepository).saveAll(List.of(oldTok));

        // 3. Brand new email: username conflict, phone conflict, then success
        when(userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc("pilot1@uav.vn"))
                .thenReturn(Optional.empty());
        when(userRepository.existsByUsernameIgnoreCase("pilot1")).thenReturn(true);
        assertThrows(SystemException.class, () -> service.requestRegisterOtp(req));

        when(userRepository.existsByUsernameIgnoreCase("pilot1")).thenReturn(false);
        when(userRepository.existsByPhoneNumber("0912345678")).thenReturn(true);
        assertThrows(SystemException.class, () -> service.requestRegisterOtp(req));

        when(userRepository.existsByPhoneNumber("0912345678")).thenReturn(false);
        when(authMailService.revealsOtp()).thenReturn(false);
        OtpChallengeResponse created = service.requestRegisterOtp(req);
        assertNull(created.devOtpPreview());
        assertEquals(900, created.expiresInSeconds());
        verify(emailDomainPolicy, atLeastOnce()).validateForAuth("pilot1@uav.vn");
    }

    @Test
    void verifyEmailOtpCoversValidationErrorsPendingSignupApprovalInactiveAndSuccess() {
        // Null/blank inputs
        assertThrows(SystemException.class, () -> service.verifyEmailOtp(null));
        assertThrows(
                SystemException.class,
                () -> service.verifyEmailOtp(new VerifyOtpRequest("c", null, " ", null)));
        assertThrows(
                SystemException.class,
                () -> service.verifyEmailOtp(new VerifyOtpRequest(" ", null, "123456", null)));

        // Wrong purpose, consumed, expired, max attempts
        AppUser u = user(10L, "orig", "orig@uav.vn", UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        u.setEmailVerified(false);

        AuthOtpToken wrongPurpose = activeToken(u, AuthOtpServiceImpl.PURPOSE_LOGIN_2FA, "h");
        when(otpTokenRepository.findByChallengeTokenForUpdate("chal-1"))
                .thenReturn(Optional.of(wrongPurpose));
        assertThrows(
                SystemException.class,
                () -> service.verifyEmailOtp(new VerifyOtpRequest("chal-1", null, "123456", null)));

        AuthOtpToken consumed = activeToken(u, AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY, "h");
        consumed.setConsumedAt(LocalDateTime.now());
        when(otpTokenRepository.findByChallengeTokenForUpdate("chal-1"))
                .thenReturn(Optional.of(consumed));
        assertThrows(
                SystemException.class,
                () -> service.verifyEmailOtp(new VerifyOtpRequest("chal-1", null, "123456", null)));

        AuthOtpToken expired = activeToken(u, AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY, "h");
        expired.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(otpTokenRepository.findByChallengeTokenForUpdate("chal-1"))
                .thenReturn(Optional.of(expired));
        assertThrows(
                SystemException.class,
                () -> service.verifyEmailOtp(new VerifyOtpRequest("chal-1", null, "123456", null)));

        AuthOtpToken maxed = activeToken(u, AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY, "h");
        maxed.setAttempts(5);
        when(otpTokenRepository.findByChallengeTokenForUpdate("chal-1"))
                .thenReturn(Optional.of(maxed));
        assertThrows(
                SystemException.class,
                () -> service.verifyEmailOtp(new VerifyOtpRequest("chal-1", null, "123456", null)));

        // Wrong code hits max attempts and consumes token
        AuthOtpToken almostMax = activeToken(u, AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY, "hash");
        almostMax.setAttempts(4);
        when(otpTokenRepository.findByChallengeTokenForUpdate("chal-1"))
                .thenReturn(Optional.of(almostMax));
        when(passwordEncoder.matches("000000", "hash")).thenReturn(false);
        assertThrows(
                SystemException.class,
                () -> service.verifyEmailOtp(new VerifyOtpRequest("chal-1", null, "000000", null)));
        assertEquals(5, almostMax.getAttempts());
        assertNotNull(almostMax.getConsumedAt());

        // Pending signup username & phone conflict then success
        AuthOtpToken pendingTok =
                activeToken(u, AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY, "hash");
        pendingTok.setPendingUsername("newuser");
        pendingTok.setPendingPhoneNumber("0999888777");
        pendingTok.setPendingPasswordHash("ENC:New123!");
        when(otpTokenRepository.findByChallengeTokenForUpdate("chal-1"))
                .thenReturn(Optional.of(pendingTok));
        when(passwordEncoder.matches("123456", "hash")).thenReturn(true);
        when(userRepository.existsByUsernameIgnoreCase("newuser")).thenReturn(true);
        assertThrows(
                SystemException.class,
                () -> service.verifyEmailOtp(new VerifyOtpRequest("chal-1", null, "123456", null)));

        pendingTok.setConsumedAt(null);
        when(userRepository.existsByUsernameIgnoreCase("newuser")).thenReturn(false);
        when(userRepository.existsByPhoneNumber("0999888777")).thenReturn(true);
        assertThrows(
                SystemException.class,
                () -> service.verifyEmailOtp(new VerifyOtpRequest("chal-1", null, "123456", null)));

        pendingTok.setConsumedAt(null);
        when(userRepository.existsByPhoneNumber("0999888777")).thenReturn(false);
        AuthResponse ok =
                service.verifyEmailOtp(new VerifyOtpRequest("chal-1", null, "123456", null));
        assertEquals("jwt-token", ok.accessToken());
        assertEquals("newuser", u.getUsername());
        assertEquals("0999888777", u.getPhoneNumber());

        // Pending approval staff user
        AppUser staff = user(11L, "op1", "op1@uav.vn", UserRole.ROLE_OPERATOR, UserStatus.INACTIVE);
        staff.setEmailVerified(false);
        AuthOtpToken staffTok =
                activeToken(staff, AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY, "hash");
        when(otpTokenRepository.findByChallengeTokenForUpdate("chal-staff"))
                .thenReturn(Optional.of(staffTok));
        AuthResponse awaiting =
                service.verifyEmailOtp(new VerifyOtpRequest("chal-staff", null, "123456", null));
        assertEquals("PENDING_APPROVAL", awaiting.mfaMethod());
        assertNull(awaiting.accessToken());

        // Locked customer cannot sign in after verifying email
        AppUser locked = user(12L, "lk", "lk@uav.vn", UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        locked.setManualLocked(true);
        AuthOtpToken lockedTok =
                activeToken(locked, AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY, "hash");
        when(otpTokenRepository.findByChallengeTokenForUpdate("chal-lk"))
                .thenReturn(Optional.of(lockedTok));
        assertThrows(
                SystemException.class,
                () ->
                        service.verifyEmailOtp(
                                new VerifyOtpRequest("chal-lk", null, "123456", null)));
    }

    @Test
    void loginChallengeAndVerifyLogin2faCoverEmailTotpReplayStaleAndLocked() {
        MockHttpServletRequest httpReq = new MockHttpServletRequest();
        httpReq.setRemoteAddr("203.0.113.10");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(httpReq));

        // 1. Unverified email -> EMAIL_VERIFY
        AppUser unverified = user(1L, "u1", "u1@uav.vn", UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        unverified.setEmailVerified(false);
        AuthResponse ch1 = service.createLoginChallenge(unverified, null);
        assertEquals(AuthOtpServiceImpl.METHOD_EMAIL_VERIFY, ch1.mfaMethod());
        verify(rateLimiter).checkClient(any(), anyString());

        // 2. Verified + TOTP -> METHOD_TOTP
        AppUser totpUser = user(2L, "u2", "u2@uav.vn", UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        totpUser.setTwoFactorMethod(AuthOtpServiceImpl.METHOD_TOTP);
        totpUser.setTotpSecret("BASE32SECRET");
        AuthResponse ch2 = service.createLoginChallenge(totpUser, null);
        assertEquals(AuthOtpServiceImpl.METHOD_TOTP, ch2.mfaMethod());

        // 3. Verified + Email -> METHOD_EMAIL
        AppUser emailUser = user(3L, "u3", "u3@uav.vn", UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        AuthResponse ch3 = service.createLoginChallenge(emailUser, null);
        assertEquals(AuthOtpServiceImpl.METHOD_EMAIL, ch3.mfaMethod());

        // verifyLogin2fa validation
        assertThrows(SystemException.class, () -> service.verifyLogin2fa(null));
        assertThrows(
                SystemException.class,
                () -> service.verifyLogin2fa(new VerifyOtpRequest("", null, "123456", null)));

        // Stale TOTP challenge (user disabled TOTP afterwards)
        AuthOtpToken staleTotp =
                activeToken(
                        emailUser,
                        AuthOtpServiceImpl.PURPOSE_LOGIN_2FA,
                        AuthOtpServiceImpl.TOTP_CHALLENGE);
        when(otpTokenRepository.findByChallengeTokenForUpdate("chal-stale"))
                .thenReturn(Optional.of(staleTotp));
        assertThrows(
                SystemException.class,
                () ->
                        service.verifyLogin2fa(
                                new VerifyOtpRequest("chal-stale", null, "123456", null)));
        assertNotNull(staleTotp.getConsumedAt());

        // TOTP replay (step <= lastStep) -> unauthorized
        totpUser.setTotpLastStep(100L);
        AuthOtpToken totpTok =
                activeToken(
                        totpUser,
                        AuthOtpServiceImpl.PURPOSE_LOGIN_2FA,
                        AuthOtpServiceImpl.TOTP_CHALLENGE);
        when(otpTokenRepository.findByChallengeTokenForUpdate("chal-totp"))
                .thenReturn(Optional.of(totpTok));
        when(totpService.matchStep("BASE32SECRET", "111111")).thenReturn(OptionalLong.of(100L));
        assertThrows(
                SystemException.class,
                () ->
                        service.verifyLogin2fa(
                                new VerifyOtpRequest("chal-totp", null, "111111", null)));

        // TOTP valid new step -> full session
        when(totpService.matchStep("BASE32SECRET", "222222")).thenReturn(OptionalLong.of(101L));
        AuthResponse okTotp =
                service.verifyLogin2fa(new VerifyOtpRequest("chal-totp", null, "222222", null));
        assertEquals("jwt-token", okTotp.accessToken());
        assertEquals(101L, totpUser.getTotpLastStep());

        // Email 2FA valid & locked user rejection
        emailUser.setManualLocked(true);
        AuthOtpToken emailTok =
                activeToken(emailUser, AuthOtpServiceImpl.PURPOSE_LOGIN_2FA, "hash");
        when(otpTokenRepository.findByChallengeTokenForUpdate("chal-em"))
                .thenReturn(Optional.of(emailTok));
        when(passwordEncoder.matches("654321", "hash")).thenReturn(true);
        assertThrows(
                SystemException.class,
                () ->
                        service.verifyLogin2fa(
                                new VerifyOtpRequest("chal-em", null, "654321", null)));
    }

    @Test
    void resendOtpForgotPasswordAndResetPasswordCoverAllPaths() {
        assertThrows(SystemException.class, () -> service.resendOtp(null));
        assertThrows(
                SystemException.class,
                () ->
                        service.resendOtp(
                                new ResendOtpRequest(
                                        null,
                                        "a@uav.vn",
                                        AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY)));
        assertThrows(
                SystemException.class,
                () -> service.resendOtp(new ResendOtpRequest(null, null, "LOGIN_2FA")));

        // Blank challengeToken + PASSWORD_RESET + unknown email -> decoy reset challenge
        when(userRepository.findByEmail("ghost@uav.vn")).thenReturn(Optional.empty());
        when(userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc("ghost@uav.vn"))
                .thenReturn(Optional.empty());
        when(authMailService.revealsOtp()).thenReturn(true);
        OtpChallengeResponse decoy =
                service.resendOtp(
                        new ResendOtpRequest(
                                "", "ghost@uav.vn", AuthOtpServiceImpl.PURPOSE_PASSWORD_RESET));
        assertEquals(AuthOtpServiceImpl.PURPOSE_PASSWORD_RESET, decoy.purpose());
        assertNotNull(decoy.devOtpPreview());

        // Unknown challengeToken: PASSWORD_RESET vs other
        when(otpTokenRepository.findByChallengeToken("missing")).thenReturn(Optional.empty());
        assertEquals(
                AuthOtpServiceImpl.PURPOSE_PASSWORD_RESET,
                service.resendOtp(
                                new ResendOtpRequest(
                                        "missing",
                                        "ghost@uav.vn",
                                        AuthOtpServiceImpl.PURPOSE_PASSWORD_RESET))
                        .purpose());
        assertThrows(
                SystemException.class,
                () -> service.resendOtp(new ResendOtpRequest("missing", null, "LOGIN_2FA")));

        // Consumed token -> superseded
        AppUser u = user(5L, "u5", "u5@uav.vn", UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        AuthOtpToken consumed = activeToken(u, AuthOtpServiceImpl.PURPOSE_LOGIN_2FA, "h");
        consumed.setConsumedAt(LocalDateTime.now());
        when(otpTokenRepository.findByChallengeToken("c-cons")).thenReturn(Optional.of(consumed));
        assertThrows(
                SystemException.class,
                () -> service.resendOtp(new ResendOtpRequest("c-cons", null, null)));

        // Password reset token resend
        AuthOtpToken resetTok = activeToken(u, AuthOtpServiceImpl.PURPOSE_PASSWORD_RESET, "h");
        when(otpTokenRepository.findByChallengeToken("c-rst")).thenReturn(Optional.of(resetTok));
        when(userRepository.findByEmail("u5@uav.vn")).thenReturn(Optional.of(u));
        assertEquals(
                AuthOtpServiceImpl.PURPOSE_PASSWORD_RESET,
                service.resendOtp(new ResendOtpRequest("c-rst", null, null)).purpose());

        // Token with null user & missing account -> notFound
        AuthOtpToken orphan = activeToken(null, AuthOtpServiceImpl.PURPOSE_ENABLE_2FA_EMAIL, "h");
        orphan.setEmail("none@uav.vn");
        when(otpTokenRepository.findByChallengeToken("c-orp")).thenReturn(Optional.of(orphan));
        when(userRepository.findByEmail("none@uav.vn")).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () -> service.resendOtp(new ResendOtpRequest("c-orp", null, null)));

        // Login 2FA TOTP & expired login 2FA
        AuthOtpToken totpLogin =
                activeToken(
                        u, AuthOtpServiceImpl.PURPOSE_LOGIN_2FA, AuthOtpServiceImpl.TOTP_CHALLENGE);
        when(otpTokenRepository.findByChallengeToken("c-totp")).thenReturn(Optional.of(totpLogin));
        assertThrows(
                SystemException.class,
                () -> service.resendOtp(new ResendOtpRequest("c-totp", null, null)));

        AuthOtpToken expiredLogin = activeToken(u, AuthOtpServiceImpl.PURPOSE_LOGIN_2FA, "h");
        expiredLogin.setExpiresAt(LocalDateTime.now().minusSeconds(5));
        when(otpTokenRepository.findByChallengeToken("c-exp"))
                .thenReturn(Optional.of(expiredLogin));
        assertThrows(
                SystemException.class,
                () -> service.resendOtp(new ResendOtpRequest("c-exp", null, null)));

        // Resend REGISTER_VERIFY with pending signup, ENABLE_2FA_EMAIL, and active LOGIN_2FA
        AuthOtpToken regPend = activeToken(u, AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY, "h");
        regPend.setPendingUsername("u5new");
        when(otpTokenRepository.findByChallengeToken("c-reg")).thenReturn(Optional.of(regPend));
        assertEquals(
                AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY,
                service.resendOtp(new ResendOtpRequest("c-reg", null, null)).purpose());

        AuthOtpToken en2fa = activeToken(u, AuthOtpServiceImpl.PURPOSE_ENABLE_2FA_EMAIL, "h");
        when(otpTokenRepository.findByChallengeToken("c-2fa")).thenReturn(Optional.of(en2fa));
        assertEquals(
                AuthOtpServiceImpl.PURPOSE_ENABLE_2FA_EMAIL,
                service.resendOtp(new ResendOtpRequest("c-2fa", null, null)).purpose());

        AuthOtpToken liveLogin = activeToken(u, AuthOtpServiceImpl.PURPOSE_LOGIN_2FA, "h");
        when(otpTokenRepository.findByChallengeToken("c-live")).thenReturn(Optional.of(liveLogin));
        assertEquals(
                AuthOtpServiceImpl.PURPOSE_LOGIN_2FA,
                service.resendOtp(new ResendOtpRequest("c-live", null, null)).purpose());

        // forgotPassword validation & admin-support privileged budget
        assertThrows(SystemException.class, () -> service.forgotPassword(null));
        assertThrows(
                SystemException.class,
                () -> service.forgotPassword(new ForgotPasswordRequest(" ")));
        service.forgotPassword(new ForgotPasswordRequest("u5@uav.vn"));
        service.forgotPassword(new ForgotPasswordRequest("u5@uav.vn"), "admin-support");
        verify(rateLimiter, atLeastOnce()).checkGlobalEmailBudget(true);

        // resetPassword resolving token by email (challengeToken == null) + user lookup fallback
        assertThrows(SystemException.class, () -> service.resetPassword(null));
        AuthOtpToken rstByEmail =
                activeToken(null, AuthOtpServiceImpl.PURPOSE_PASSWORD_RESET, "hash");
        rstByEmail.setEmail("u5@uav.vn");
        when(otpTokenRepository
                        .findFirstByEmailIgnoreCaseAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                                "u5@uav.vn", AuthOtpServiceImpl.PURPOSE_PASSWORD_RESET))
                .thenReturn(Optional.of(rstByEmail));
        when(otpTokenRepository.findByChallengeTokenForUpdate("chal-1"))
                .thenReturn(Optional.of(rstByEmail));
        when(passwordEncoder.matches("123456", "hash")).thenReturn(true);

        MessageResponse msg =
                service.resetPassword(
                        new ResetPasswordRequest(
                                null, "u5@uav.vn", "123456", "NewPass123!", "NewPass123!"));
        assertNotNull(msg.message());
        verify(sessionTermination).terminateAll(u, "PASSWORD_RESET");

        // Fallback terminateSessions via refreshTokenService when sessionTermination is null
        service.setSessionTermination(null);
        rstByEmail.setConsumedAt(null);
        service.resetPassword(
                new ResetPasswordRequest(
                        null, "u5@uav.vn", "123456", "NewPass456!", "NewPass456!"));
        verify(refreshTokenService).deleteByUser(u);
    }

    @Test
    void twoFactorStatusSetupEnableAndDisableCoverAllBranches() {
        assertThrows(SystemException.class, () -> service.get2faStatus(" "));
        when(userRepository.findByUsername("missing")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("missing")).thenReturn(Optional.empty());
        assertThrows(SystemException.class, () -> service.get2faStatus("missing"));

        AppUser u = user(9L, "u9", "u9@uav.vn", UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        u.setTwoFactorMethod(null);
        when(userRepository.findByUsername("u9@uav.vn")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("u9@uav.vn")).thenReturn(Optional.of(u));
        TwoFactorStatusResponse st = service.get2faStatus("u9@uav.vn");
        assertEquals(AuthOtpServiceImpl.METHOD_EMAIL, st.method());

        when(userRepository.findByUsername("u9")).thenReturn(Optional.of(u));
        when(totpService.generateSecret()).thenReturn("NEWSECRET");
        when(totpService.buildOtpAuthUri("u9@uav.vn", "NEWSECRET")).thenReturn("otpauth://totp");
        when(totpService.getIssuer()).thenReturn("UAV-PAS");

        // setup2fa TOTP & EMAIL
        TwoFactorSetupResponse totpSetup =
                service.setup2fa("u9", new TwoFactorSetupRequest("totp"));
        assertEquals("NEWSECRET", totpSetup.secret());
        assertEquals("NEWSECRET", u.getPendingTotpSecret());

        TwoFactorSetupResponse emailSetup = service.setup2fa("u9", null);
        assertEquals(AuthOtpServiceImpl.METHOD_EMAIL, emailSetup.method());

        // enable2fa validation & TOTP paths
        assertThrows(SystemException.class, () -> service.enable2fa("u9", null));
        u.setPendingTotpSecret(null);
        assertThrows(
                SystemException.class,
                () -> service.enable2fa("u9", new TwoFactorVerifyRequest("TOTP", null, "123456")));

        u.setPendingTotpSecret("NEWSECRET");
        when(totpService.matchStep("NEWSECRET", "000000")).thenReturn(OptionalLong.empty());
        assertThrows(
                SystemException.class,
                () -> service.enable2fa("u9", new TwoFactorVerifyRequest("TOTP", null, "000000")));

        when(totpService.matchStep("NEWSECRET", "123456")).thenReturn(OptionalLong.of(55L));
        TwoFactorStatusResponse enabledTotp =
                service.enable2fa("u9", new TwoFactorVerifyRequest("TOTP", null, "123456"));
        assertTrue(enabledTotp.enabled());
        assertEquals(AuthOtpServiceImpl.METHOD_TOTP, enabledTotp.method());

        // enable2fa EMAIL: mismatch email vs valid
        AuthOtpToken wrongEmail = activeToken(u, AuthOtpServiceImpl.PURPOSE_ENABLE_2FA_EMAIL, "h");
        wrongEmail.setEmail("other@uav.vn");
        when(otpTokenRepository.findByChallengeTokenForUpdate("c-en"))
                .thenReturn(Optional.of(wrongEmail));
        assertThrows(
                SystemException.class,
                () ->
                        service.enable2fa(
                                "u9", new TwoFactorVerifyRequest("EMAIL", "c-en", "123456")));

        AuthOtpToken rightEmail = activeToken(u, AuthOtpServiceImpl.PURPOSE_ENABLE_2FA_EMAIL, "h");
        when(otpTokenRepository.findByChallengeTokenForUpdate("c-en"))
                .thenReturn(Optional.of(rightEmail));
        when(passwordEncoder.matches("123456", "h")).thenReturn(true);
        TwoFactorStatusResponse enabledEmail =
                service.enable2fa("u9", new TwoFactorVerifyRequest(null, "c-en", "123456"));
        assertEquals(AuthOtpServiceImpl.METHOD_EMAIL, enabledEmail.method());

        // disable2fa: neither password nor code -> badRequest
        assertThrows(SystemException.class, () -> service.disable2fa("u9", null));

        // disable2fa: wrong password -> badRequest; right password -> disables
        when(passwordEncoder.matches("wrong", u.getPasswordHash())).thenReturn(false);
        assertThrows(
                SystemException.class,
                () -> service.disable2fa("u9", new TwoFactorDisableRequest("wrong", null)));

        when(passwordEncoder.matches("Secret123!", u.getPasswordHash())).thenReturn(true);
        TwoFactorStatusResponse disabled1 =
                service.disable2fa("u9", new TwoFactorDisableRequest("Secret123!", null));
        assertFalse(disabled1.enabled());

        // disable2fa: via TOTP code (non-TOTP fails, valid TOTP succeeds)
        assertThrows(
                SystemException.class,
                () -> service.disable2fa("u9", new TwoFactorDisableRequest(null, "123456")));

        u.setTwoFactorEnabled(true);
        u.setTwoFactorMethod(AuthOtpServiceImpl.METHOD_TOTP);
        u.setTotpSecret("NEWSECRET");
        u.setTotpLastStep(55L);
        when(totpService.matchStep("NEWSECRET", "654321")).thenReturn(OptionalLong.of(56L));
        TwoFactorStatusResponse disabled2 =
                service.disable2fa("u9", new TwoFactorDisableRequest(null, "654321"));
        assertFalse(disabled2.enabled());
    }
}
