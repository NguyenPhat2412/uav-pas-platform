package com.uav.platform.service.impl.infrastructure;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.uav.platform.controller.infrastructure.MailOtpAdminController;
import com.uav.platform.dao.auth.IAuthOtpTokenDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dao.infrastructure.IMailOtpSettingsDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.record.infrastructure.MailConnectionCheck;
import com.uav.platform.dto.request.auth.verification.ForgotPasswordRequest;
import com.uav.platform.dto.request.auth.verification.VerifyOtpRequest;
import com.uav.platform.dto.request.infrastructure.MailOtpSettingsUpdateRequest;
import com.uav.platform.dto.response.infrastructure.MailOtpSettingsResponse;
import com.uav.platform.entity.auth.AuthOtpToken;
import com.uav.platform.entity.infrastructure.MailOtpSettings;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.auth.AuthRateLimitAction;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.GlobalExceptionHandler;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.auth.session.AuthMapper;
import com.uav.platform.mapper.user.account.UserMapper;
import com.uav.platform.security.jwt.JwtTokenProvider;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.auth.session.AuthRateLimitService;
import com.uav.platform.service.auth.verification.AuthMailService;
import com.uav.platform.service.auth.verification.AuthOtpService;
import com.uav.platform.service.auth.verification.TotpService;
import com.uav.platform.service.impl.auth.session.AuthRateLimitServiceImpl;
import com.uav.platform.service.impl.auth.verification.AuthOtpServiceImpl;
import com.uav.platform.service.infrastructure.MailDiagnosticsService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

class MailOtpSettingsServiceTest {

    private IMailOtpSettingsDao repository;
    private IAuthOtpTokenDao otpTokenRepository;
    private IUserDao userRepository;
    private JavaMailSender envMailSender;
    private MailDiagnosticsService mailDiagnostics;
    private AuthOtpService authOtpService;
    private AuthRateLimitServiceImpl rateLimitService;
    private AuditLogService auditLogService;
    private MailOtpSettingsServiceImpl service;

    private final AtomicReference<MailOtpSettings> singletonStore = new AtomicReference<>();
    private final List<AuthOtpToken> tokenStore = new ArrayList<>();
    private AppUser pilotUser;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        repository = mock(IMailOtpSettingsDao.class);
        otpTokenRepository = mock(IAuthOtpTokenDao.class);
        userRepository = mock(IUserDao.class);
        envMailSender = mock(JavaMailSender.class);
        mailDiagnostics = mock(MailDiagnosticsService.class);
        authOtpService = mock(AuthOtpService.class);
        auditLogService = mock(AuditLogService.class);

        Clock fixedClock = Clock.fixed(Instant.parse("2026-11-18T12:00:00Z"), ZoneOffset.UTC);
        rateLimitService = new AuthRateLimitServiceImpl(true, 3, 8, 15, 60, fixedClock);

        when(repository.findById(MailOtpSettings.SINGLETON_ID))
                .thenAnswer(inv -> Optional.ofNullable(singletonStore.get()));
        when(repository.saveAndFlush(any(MailOtpSettings.class)))
                .thenAnswer(
                        inv -> {
                            MailOtpSettings row = inv.getArgument(0);
                            singletonStore.set(row);
                            return row;
                        });
        doAnswer(
                        inv -> {
                            singletonStore.set(null);
                            return null;
                        })
                .when(repository)
                .deleteById(MailOtpSettings.SINGLETON_ID);

        when(mailDiagnostics.connection())
                .thenReturn(new MailConnectionCheck("UP", Instant.now(), null));

        ObjectProvider<JavaMailSender> senderProvider = mock(ObjectProvider.class);
        when(senderProvider.getIfAvailable()).thenReturn(envMailSender);

        ObjectProvider<MailDiagnosticsService> diagProvider = mock(ObjectProvider.class);
        when(diagProvider.getIfAvailable()).thenReturn(mailDiagnostics);

        ObjectProvider<AuthOtpService> otpProvider = mock(ObjectProvider.class);
        when(otpProvider.getIfAvailable()).thenReturn(authOtpService);

        ObjectProvider<AuthRateLimitService> limiterProvider = mock(ObjectProvider.class);
        when(limiterProvider.getIfAvailable()).thenReturn(rateLimitService);

        service =
                new MailOtpSettingsServiceImpl(
                        repository,
                        otpTokenRepository,
                        userRepository,
                        senderProvider,
                        diagProvider,
                        otpProvider,
                        limiterProvider,
                        auditLogService,
                        "test-jwt-secret-key-for-mail-otp-aes-gcm-32b",
                        false,
                        "localhost",
                        1025,
                        "",
                        "",
                        "no-reply@uav.all1.vn",
                        false,
                        false,
                        10,
                        60,
                        3,
                        8,
                        15);

        rateLimitService.setMailOtpSettings(service);

        pilotUser =
                new AppUser(
                        "pilot_one",
                        "pilot.one@gmail.com",
                        "hash",
                        "0901234567",
                        "Pilot One",
                        null,
                        UserStatus.ACTIVE);
        pilotUser.setId(44L);
        pilotUser.setRole(UserRole.ROLE_PILOT);

        when(userRepository.findByEmail("pilot.one@gmail.com")).thenReturn(Optional.of(pilotUser));
        when(userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc("pilot.one@gmail.com"))
                .thenReturn(Optional.of(pilotUser));
    }

    @Test
    void gmailAppPasswordStripsSpacesEncryptsWithAesGcmBuildsDynamicMailSenderAndResetsCleanly() {
        Authentication adminAuth =
                UsernamePasswordAuthenticationToken.authenticated("admin", "", List.of());

        // 1. Default state before DB override
        MailOtpSettingsResponse initial = service.getSettings();
        assertFalse(initial.mailEnabled());
        assertFalse(initial.hasDatabaseOverride());
        assertEquals("NONE", initial.passwordSource());
        assertFalse(initial.passwordConfigured());
        assertSame(envMailSender, service.currentMailSender());

        // 2. Save 16-char Google App Password formatted in 4 groups of 4 ("abcd efgh ijkl mnop")
        MailOtpSettingsResponse updated =
                service.updateSettings(
                        new MailOtpSettingsUpdateRequest(
                                true,
                                "smtp.gmail.com",
                                587,
                                "uavpas.mailer@gmail.com",
                                "abcd efgh ijkl mnop",
                                false,
                                "uavpas.mailer@gmail.com",
                                "UAV PAS Billing & Security",
                                true,
                                true,
                                15,
                                30,
                                6,
                                5,
                                12,
                                25),
                        adminAuth);

        assertTrue(updated.mailEnabled());
        assertTrue(updated.hasDatabaseOverride());
        assertTrue(updated.passwordConfigured());
        assertEquals("DATABASE", updated.passwordSource());
        assertEquals("•••• •••• •••• mnop", updated.passwordHint());
        assertEquals("smtp.gmail.com", updated.smtpHost());
        assertEquals(587, updated.smtpPort());
        assertEquals("uavpas.mailer@gmail.com", updated.smtpUsername());
        assertEquals("UAV PAS Billing & Security", updated.senderDisplayName());
        assertEquals(15, updated.otpTtlMinutes());
        assertEquals(30, updated.resendCooldownSeconds());
        assertEquals(6, updated.maxOtpAttempts());
        assertEquals(5, updated.otpPerAccount());
        assertEquals(12, updated.otpPerIp());
        assertEquals(25, updated.maxEmailsPerMinute());
        assertEquals("admin", updated.updatedBy());

        // Verify encrypted column never contains plaintext and round-trips to space-stripped
        // 16-char
        // password
        MailOtpSettings storedRow = singletonStore.get();
        assertNotNull(storedRow.getSmtpPasswordEncrypted());
        assertFalse(storedRow.getSmtpPasswordEncrypted().contains("abcdefghijklmnop"));
        assertEquals("abcdefghijklmnop", service.decrypt(storedRow.getSmtpPasswordEncrypted()));

        // Verify dynamic JavaMailSenderImpl properties
        JavaMailSender activeSender = service.currentMailSender();
        assertInstanceOf(JavaMailSenderImpl.class, activeSender);
        JavaMailSenderImpl impl = (JavaMailSenderImpl) activeSender;
        assertEquals("smtp.gmail.com", impl.getHost());
        assertEquals(587, impl.getPort());
        assertEquals("uavpas.mailer@gmail.com", impl.getUsername());
        assertEquals("abcdefghijklmnop", impl.getPassword());
        assertEquals("UTF-8", impl.getDefaultEncoding());
        assertEquals("true", impl.getJavaMailProperties().getProperty("mail.smtp.auth"));
        assertEquals("true", impl.getJavaMailProperties().getProperty("mail.smtp.starttls.enable"));
        assertEquals(
                "10000", impl.getJavaMailProperties().getProperty("mail.smtp.connectiontimeout"));

        verify(mailDiagnostics, atLeastOnce()).invalidateConnectionCache();
        verify(auditLogService)
                .record(any(), eq("admin"), any(), eq("MAIL_OTP_SETTINGS"), eq("1"), anyString());

        // 3. Reset to .env defaults
        MailOtpSettingsResponse reset =
                service.updateSettings(
                        new MailOtpSettingsUpdateRequest(
                                null, null, null, null, null, true, null, null, null, null, null,
                                null, null, null, null, null),
                        adminAuth);
        assertFalse(reset.hasDatabaseOverride());
        assertFalse(reset.mailEnabled());
        assertEquals("NONE", reset.passwordSource());
        assertSame(envMailSender, service.currentMailSender());
    }

    @Test
    void dynamicPoliciesApplyToAuthOtpServiceAndRateLimiterAndClearAccountLimitsWorks() {
        Authentication adminAuth =
                UsernamePasswordAuthenticationToken.authenticated("admin", "", List.of());

        service.updateSettings(
                new MailOtpSettingsUpdateRequest(
                        true,
                        "smtp.gmail.com",
                        587,
                        "sender@gmail.com",
                        "xxxx yyyy zzzz wwww",
                        false,
                        "sender@gmail.com",
                        "UAV PAS",
                        true,
                        true,
                        12,
                        45,
                        2,
                        2,
                        10,
                        20),
                adminAuth);

        // 1. Rate limiter honors dynamic otpPerAccount = 2 and clearAccountLimits resets both hits
        // &
        // cooldowns
        rateLimitService.checkAccount(AuthRateLimitAction.OTP_ISSUE, "pilot.one@gmail.com");
        rateLimitService.checkAccount(AuthRateLimitAction.OTP_ISSUE, "pilot.one@gmail.com");
        assertThrows(
                SystemException.class,
                () ->
                        rateLimitService.checkAccount(
                                AuthRateLimitAction.OTP_ISSUE, "pilot.one@gmail.com"));

        rateLimitService.startResendCooldown("PASSWORD_RESET|pilot.one@gmail.com");
        assertThrows(
                SystemException.class,
                () -> rateLimitService.checkResendCooldown("PASSWORD_RESET|pilot.one@gmail.com"));

        rateLimitService.clearAccountLimits("Pilot.One@gmail.com");
        assertDoesNotThrow(
                () -> rateLimitService.checkResendCooldown("PASSWORD_RESET|pilot.one@gmail.com"));
        assertDoesNotThrow(
                () ->
                        rateLimitService.checkAccount(
                                AuthRateLimitAction.OTP_ISSUE, "pilot.one@gmail.com"));

        // 2. AuthOtpServiceImpl honors dynamic otpTtlMinutes = 12 and maxOtpAttempts = 2
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode(anyString())).thenReturn("hashed-code");
        when(encoder.matches(eq("000000"), anyString())).thenReturn(false);

        IAuthOtpTokenDao localTokens = mock(IAuthOtpTokenDao.class);
        AtomicReference<AuthOtpToken> issuedTokenRef = new AtomicReference<>();
        when(localTokens.findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(
                        anyString(), anyString()))
                .thenReturn(List.of());
        when(localTokens.save(any(AuthOtpToken.class)))
                .thenAnswer(
                        c -> {
                            AuthOtpToken t = c.getArgument(0);
                            issuedTokenRef.set(t);
                            return t;
                        });

        AuthMailService authMail = new AuthMailService(envMailSender, false, "old@uav.vn", false);
        authMail.setMailOtpSettings(service);
        assertTrue(authMail.isMailEnabled());

        AuthOtpServiceImpl realOtpService =
                new AuthOtpServiceImpl(
                        userRepository,
                        localTokens,
                        encoder,
                        mock(JwtTokenProvider.class),
                        null,
                        authMail,
                        mock(TotpService.class),
                        mock(AuthMapper.class),
                        mock(UserMapper.class),
                        10);
        realOtpService.setMailOtpSettings(service);

        var challenge =
                realOtpService.forgotPassword(new ForgotPasswordRequest("pilot.one@gmail.com"));
        assertEquals(12 * 60, challenge.expiresInSeconds());

        AuthOtpToken issued = issuedTokenRef.get();
        when(localTokens.findByChallengeTokenForUpdate(issued.getChallengeToken()))
                .thenReturn(Optional.of(issued));

        // 2 wrong attempts lock/consume the token because dynamic maxOtpAttempts = 2
        assertThrows(
                SystemException.class,
                () ->
                        realOtpService.verifyLogin2fa(
                                new VerifyOtpRequest(
                                        issued.getChallengeToken(), null, "000000", "EMAIL")));
        issued.setPurpose(AuthOtpServiceImpl.PURPOSE_LOGIN_2FA);
        assertThrows(
                SystemException.class,
                () ->
                        realOtpService.verifyLogin2fa(
                                new VerifyOtpRequest(
                                        issued.getChallengeToken(), null, "000000", "EMAIL")));
        assertEquals(1, issued.getAttempts());
        assertThrows(
                SystemException.class,
                () ->
                        realOtpService.verifyLogin2fa(
                                new VerifyOtpRequest(
                                        issued.getChallengeToken(), null, "000000", "EMAIL")));
        assertEquals(2, issued.getAttempts());
        assertNotNull(issued.getConsumedAt());
    }

    @Test
    @SuppressWarnings("unchecked")
    void adminEndpointsExposeSafeOtpTokensInvalidateAndSupportActionsWithoutLeakingSecrets()
            throws Exception {
        LocalDateTime now = LocalDateTime.now();

        AuthOtpToken activeToken = new AuthOtpToken();
        activeToken.setId(101L);
        activeToken.setUser(pilotUser);
        activeToken.setEmail(pilotUser.getEmail());
        activeToken.setPurpose("PASSWORD_RESET");
        activeToken.setCodeHash("$2a$10$SUPER_SECRET_BCRYPT_HASH");
        activeToken.setChallengeToken("secret-challenge-uuid-101");
        activeToken.setAttempts(1);
        activeToken.setCreatedAt(now.minusMinutes(2));
        activeToken.setExpiresAt(now.plusMinutes(8));

        AuthOtpToken lockedToken = new AuthOtpToken();
        lockedToken.setId(102L);
        lockedToken.setUser(pilotUser);
        lockedToken.setEmail(pilotUser.getEmail());
        lockedToken.setPurpose("LOGIN_2FA");
        lockedToken.setCodeHash("$2a$10$SUPER_SECRET_LOCKED");
        lockedToken.setChallengeToken("secret-challenge-uuid-102");
        lockedToken.setAttempts(5);
        lockedToken.setCreatedAt(now.minusMinutes(3));
        lockedToken.setExpiresAt(now.plusMinutes(7));

        tokenStore.add(activeToken);
        tokenStore.add(lockedToken);

        when(otpTokenRepository.findAll(any(HibernateSpecification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(tokenStore));
        when(otpTokenRepository.findById(101L)).thenReturn(Optional.of(activeToken));
        when(otpTokenRepository.saveAndFlush(any(AuthOtpToken.class)))
                .thenAnswer(c -> c.getArgument(0));

        Authentication adminAuth =
                UsernamePasswordAuthenticationToken.authenticated("admin", "", List.of());

        MockMvc mvc =
                MockMvcBuilders.standaloneSetup(new MailOtpAdminController(service))
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();

        // 1. List OTP tokens — verify statuses & confirm codeHash / challengeToken are NEVER in
        // JSON!
        String listJson =
                mvc.perform(get("/api/v1/admin/infrastructure/otp-tokens").principal(adminAuth))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content[0].id").value(101))
                        .andExpect(jsonPath("$.content[0].status").value("ACTIVE"))
                        .andExpect(jsonPath("$.content[1].id").value(102))
                        .andExpect(jsonPath("$.content[1].status").value("LOCKED"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();

        assertFalse(listJson.contains("codeHash"));
        assertFalse(listJson.contains("challengeToken"));
        assertFalse(listJson.contains("SUPER_SECRET"));
        assertFalse(listJson.contains("secret-challenge-uuid"));

        // 2. Invalidate active token -> status becomes EXPIRED
        mvc.perform(
                        post("/api/v1/admin/infrastructure/otp-tokens/101/invalidate")
                                .principal(adminAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(101))
                .andExpect(jsonPath("$.status").value("EXPIRED"));

        // 3. Support send-reset: unknown user returns 404; known user clears rate limit & triggers
        // forgotPassword
        mvc.perform(
                        post("/api/v1/admin/infrastructure/otp-support/send-reset")
                                .principal(adminAuth)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"missing.user@gmail.com\"}"))
                .andExpect(status().isNotFound());

        mvc.perform(
                        post("/api/v1/admin/infrastructure/otp-support/send-reset")
                                .principal(adminAuth)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"pilot.one@gmail.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("pilot.one@gmail.com"))
                .andExpect(jsonPath("$.action").value("SEND_PASSWORD_RESET_OTP"));

        verify(authOtpService)
                .forgotPassword(
                        eq(new ForgotPasswordRequest("pilot.one@gmail.com")), eq("admin-support"));

        // 4. Support clear-rate-limit
        mvc.perform(
                        post("/api/v1/admin/infrastructure/otp-support/clear-rate-limit")
                                .principal(adminAuth)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"pilot.one@gmail.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action").value("CLEAR_RATE_LIMIT"));
    }
}
