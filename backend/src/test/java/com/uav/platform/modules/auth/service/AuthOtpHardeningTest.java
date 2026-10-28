package com.uav.platform.modules.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.dto.request.ForgotPasswordRequest;
import com.uav.platform.modules.auth.dto.request.RegisterRequest;
import com.uav.platform.modules.auth.dto.request.ResendOtpRequest;
import com.uav.platform.modules.auth.dto.request.ResetPasswordRequest;
import com.uav.platform.modules.auth.dto.request.TwoFactorDisableRequest;
import com.uav.platform.modules.auth.dto.request.TwoFactorSetupRequest;
import com.uav.platform.modules.auth.dto.request.TwoFactorVerifyRequest;
import com.uav.platform.modules.auth.dto.request.VerifyOtpRequest;
import com.uav.platform.modules.auth.entity.AuthOtpToken;
import com.uav.platform.modules.auth.mapper.AuthMapper;
import com.uav.platform.modules.auth.repository.AuthOtpTokenRepository;
import com.uav.platform.modules.auth.service.impl.AuthOtpServiceImpl;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.mapper.UserMapper;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.security.jwt.JwtTokenProvider;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;

/** Email OTP, 2FA and reset flows must never open a session without the right factor. */
class AuthOtpHardeningTest {
    final UserRepository users = mock(UserRepository.class);
    final AuthOtpTokenRepository tokens = mock(AuthOtpTokenRepository.class);
    final PasswordEncoder encoder = mock(PasswordEncoder.class);
    final JwtTokenProvider jwt = mock(JwtTokenProvider.class);
    final AuthMailService mail = mock(AuthMailService.class);
    final TotpService totp = mock(TotpService.class);
    final SessionTerminationService sessions = mock(SessionTerminationService.class);
    final AuthOtpServiceImpl otp;

    AuthOtpHardeningTest() {
        when(encoder.encode(anyString())).thenReturn("hash");
        when(tokens.findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(anyString(), anyString()))
                .thenReturn(List.of());
        when(tokens.save(any(AuthOtpToken.class))).thenAnswer(c -> c.getArgument(0));
        when(jwt.generateToken(any(), any(), any(), any())).thenReturn("access-token");
        otp =
                new AuthOtpServiceImpl(
                        users,
                        tokens,
                        encoder,
                        jwt,
                        null,
                        mail,
                        totp,
                        mock(AuthMapper.class),
                        mock(UserMapper.class),
                        10);
        otp.setSessionTermination(sessions);
    }

    private static String code(Runnable r) {
        return assertThrows(SystemException.class, r::run).getCode();
    }

    private AppUser user(String method, String totpSecret) {
        AppUser u = new AppUser("pilot", "pilot@x.vn", "pw-hash", "0901234567", UserStatus.ACTIVE);
        u.setId(5L);
        u.setRole(UserRole.ROLE_PILOT);
        u.setEmailVerified(true);
        u.setTwoFactorEnabled(true);
        u.setTwoFactorMethod(method);
        u.setTotpSecret(totpSecret);
        return u;
    }

    private AuthOtpToken token(AppUser u, String purpose, String codeHash, String challenge) {
        AuthOtpToken t = new AuthOtpToken();
        t.setUser(u);
        t.setEmail(u.getEmail());
        t.setPurpose(purpose);
        t.setCodeHash(codeHash);
        t.setChallengeToken(challenge);
        t.setAttempts(0);
        t.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        when(tokens.findByChallengeTokenForUpdate(challenge)).thenReturn(Optional.of(t));
        when(tokens.findByChallengeToken(challenge)).thenReturn(Optional.of(t));
        return t;
    }

    // ---- 1: an email code alone never opens a session ----

    @Test
    void resendWithoutAChallengeCannotMintALoginCode() {
        when(users.findByEmail("pilot@x.vn")).thenReturn(Optional.of(user("EMAIL", null)));
        for (String purpose : new String[] {null, "LOGIN_2FA", "ENABLE_2FA_EMAIL", "bogus"}) {
            assertEquals(
                    "AUTH_CHALLENGE_REQUIRED",
                    code(() -> otp.resendOtp(new ResendOtpRequest(null, "pilot@x.vn", purpose))),
                    String.valueOf(purpose));
        }
        verify(tokens, never()).save(any());
        verify(mail, never()).sendOtpEmail(any(), any(), any(), anyInt());
    }

    @Test
    void aResetCodeCannotAnswerALoginChallenge() {
        AppUser u = user("EMAIL", null);
        when(encoder.matches(anyString(), anyString())).thenReturn(true);
        for (String purpose : List.of("PASSWORD_RESET", "REGISTER_VERIFY", "ENABLE_2FA_EMAIL")) {
            token(u, purpose, "hash", "c-" + purpose);
            assertEquals(
                    "OTP_CHALLENGE_PURPOSE_MISMATCH",
                    code(
                            () ->
                                    otp.verifyLogin2fa(
                                            new VerifyOtpRequest(
                                                    "c-" + purpose, null, "123456", "EMAIL"))));
        }
        verifyNoInteractions(jwt);
    }

    @Test
    void verify2faNeedsTheChallengeNotJustTheEmail() {
        assertEquals(
                "AUTH_CHALLENGE_REQUIRED",
                code(
                        () ->
                                otp.verifyLogin2fa(
                                        new VerifyOtpRequest(
                                                null, "pilot@x.vn", "123456", "EMAIL"))));
    }

    @Test
    void anAuthenticatorAccountNeverAcceptsAnEmailCode() {
        AppUser u = user("TOTP", "SECRET");
        when(encoder.matches(anyString(), anyString())).thenReturn(true);
        when(totp.matchStep(anyString(), anyString())).thenReturn(OptionalLong.empty());
        // Even an email-code challenge (e.g. issued before TOTP was enabled) needs the TOTP code.
        token(u, "LOGIN_2FA", "hash", "email-challenge");
        assertThrows(
                SystemException.class,
                () ->
                        otp.verifyLogin2fa(
                                new VerifyOtpRequest("email-challenge", null, "123456", "EMAIL")));
        verifyNoInteractions(jwt);
    }

    @Test
    void anAuthenticatorChallengeCannotBeSwitchedToEmail() {
        AppUser u = user("TOTP", "SECRET");
        token(u, "LOGIN_2FA", "TOTP_CHALLENGE", "totp-challenge");
        assertEquals(
                "AUTH_2FA_TOTP_REQUIRED",
                code(
                        () ->
                                otp.resendOtp(
                                        new ResendOtpRequest(
                                                "totp-challenge", "pilot@x.vn", "LOGIN_2FA"))));
        verify(mail, never()).sendOtpEmail(any(), any(), any(), anyInt());
    }

    @Test
    void totpLoginChallengeIgnoresAnEmailOverride() {
        AppUser u = user("TOTP", "SECRET");
        var res = otp.createLoginChallenge(u, "EMAIL");
        assertEquals("TOTP", res.mfaMethod());
        verify(mail, never()).sendOtpEmail(any(), any(), any(), anyInt());
    }

    // ---- 11: TOTP codes are single use ----

    @Test
    void aTotpCodeCannotBeReplayedInsideItsWindow() {
        AppUser u = user("TOTP", "SECRET");
        when(totp.matchStep("SECRET", "123456")).thenReturn(OptionalLong.of(100L));
        token(u, "LOGIN_2FA", "TOTP_CHALLENGE", "first");
        otp.verifyLogin2fa(new VerifyOtpRequest("first", null, "123456", "TOTP"));
        assertEquals(100L, u.getTotpLastStep());

        token(u, "LOGIN_2FA", "TOTP_CHALLENGE", "second");
        assertThrows(
                SystemException.class,
                () -> otp.verifyLogin2fa(new VerifyOtpRequest("second", null, "123456", "TOTP")));
        verify(jwt, times(1)).generateToken(any(), any(), any(), any());
    }

    // ---- 8: TOTP setup is pending until confirmed ----

    @Test
    void totpSetupKeepsTheActiveSecretUntilACodeConfirmsTheNewOne() {
        AppUser u = user("TOTP", "OLD-SECRET");
        when(users.findByUsername("pilot")).thenReturn(Optional.of(u));
        when(totp.generateSecret()).thenReturn("NEW-SECRET");

        otp.setup2fa("pilot", new TwoFactorSetupRequest("TOTP"));
        assertEquals("OLD-SECRET", u.getTotpSecret());
        assertEquals("NEW-SECRET", u.getPendingTotpSecret());

        when(totp.matchStep("NEW-SECRET", "000000")).thenReturn(OptionalLong.empty());
        assertThrows(
                SystemException.class,
                () -> otp.enable2fa("pilot", new TwoFactorVerifyRequest("TOTP", null, "000000")));
        assertEquals("OLD-SECRET", u.getTotpSecret());

        when(totp.matchStep("NEW-SECRET", "654321")).thenReturn(OptionalLong.of(42L));
        otp.enable2fa("pilot", new TwoFactorVerifyRequest("TOTP", null, "654321"));
        assertEquals("NEW-SECRET", u.getTotpSecret());
        assertNull(u.getPendingTotpSecret());
        assertEquals(42L, u.getTotpLastStep());
        assertTrue(u.isTwoFactorEnabled());
    }

    @Test
    void enablingTotpWithoutASetupIsRejected() {
        AppUser u = user("EMAIL", "ACTIVE-ONLY");
        when(users.findByUsername("pilot")).thenReturn(Optional.of(u));
        assertThrows(
                SystemException.class,
                () -> otp.enable2fa("pilot", new TwoFactorVerifyRequest("TOTP", null, "123456")));
        verify(totp, never()).matchStep(anyString(), anyString());
    }

    // ---- 7: turning 2FA off needs the password or a current code ----

    @Test
    void disabling2faNeedsThePasswordOrACurrentCode() {
        AppUser u = user("EMAIL", null);
        when(users.findByUsername("pilot")).thenReturn(Optional.of(u));
        assertEquals(
                "AUTH_2FA_DISABLE_CONFIRM_REQUIRED",
                code(() -> otp.disable2fa("pilot", new TwoFactorDisableRequest(null, null))));
        assertEquals(
                "AUTH_2FA_DISABLE_CONFIRM_REQUIRED", code(() -> otp.disable2fa("pilot", null)));
        when(encoder.matches("wrong", "pw-hash")).thenReturn(false);
        assertEquals(
                "AUTH_2FA_DISABLE_PASSWORD_INVALID",
                code(() -> otp.disable2fa("pilot", new TwoFactorDisableRequest("wrong", null))));
        // Email-method accounts have no standing code; a code alone is not enough.
        assertEquals(
                "AUTH_2FA_DISABLE_CODE_INVALID",
                code(() -> otp.disable2fa("pilot", new TwoFactorDisableRequest(null, "123456"))));
        assertTrue(u.isTwoFactorEnabled());

        when(encoder.matches("right", "pw-hash")).thenReturn(true);
        otp.disable2fa("pilot", new TwoFactorDisableRequest("right", null));
        assertFalse(u.isTwoFactorEnabled());
    }

    @Test
    void anAuthenticatorCodeCanConfirmDisabling() {
        AppUser u = user("TOTP", "SECRET");
        when(users.findByUsername("pilot")).thenReturn(Optional.of(u));
        when(totp.matchStep("SECRET", "123456")).thenReturn(OptionalLong.of(7L));
        otp.disable2fa("pilot", new TwoFactorDisableRequest(null, "123456"));
        assertFalse(u.isTwoFactorEnabled());
    }

    // ---- 11: no account enumeration through forgot-password ----

    @Test
    void forgotPasswordAnswersTheSameForUnknownEmails() {
        AppUser u = user("EMAIL", null);
        when(users.findByEmail("pilot@x.vn")).thenReturn(Optional.of(u));
        var known = otp.forgotPassword(new ForgotPasswordRequest("pilot@x.vn"));
        var unknown = otp.forgotPassword(new ForgotPasswordRequest("nobody@x.vn"));

        assertEquals(known.message(), unknown.message());
        assertEquals(known.purpose(), unknown.purpose());
        assertEquals(known.expiresInSeconds(), unknown.expiresInSeconds());
        assertNotNull(unknown.challengeToken());
        assertEquals("nobody@x.vn", unknown.email());
        verify(mail, times(1)).sendOtpEmail(eq("pilot@x.vn"), any(), any(), anyInt());
        verify(mail, never()).sendOtpEmail(eq("nobody@x.vn"), any(), any(), anyInt());

        // The stand-in challenge is stored like a real one, without an account behind it.
        ArgumentCaptor<AuthOtpToken> saved = ArgumentCaptor.forClass(AuthOtpToken.class);
        verify(tokens, times(2)).save(saved.capture());
        AuthOtpToken decoy = saved.getAllValues().get(1);
        assertNull(decoy.getUser());
        assertEquals("PASSWORD_RESET", decoy.getPurpose());
        assertEquals(unknown.challengeToken(), decoy.getChallengeToken());
    }

    // ---- 5: a reset ends every session ----

    @Test
    void passwordResetRevokesAllSessions() {
        AppUser u = user("EMAIL", null);
        when(encoder.matches("123456", "hash")).thenReturn(true);
        token(u, "PASSWORD_RESET", "hash", "reset");
        otp.resetPassword(new ResetPasswordRequest("reset", null, "123456", "BrandNew-Pass1"));
        verify(sessions).terminateAll(u, "PASSWORD_RESET");
    }

    // ---- 10: a restarted sign-up cannot rewrite or reactivate the account early ----

    @Test
    void restartedSignUpAppliesDetailsOnlyAfterVerificationAndKeepsStatus() {
        AppUser existing =
                new AppUser(
                        "victim", "victim@x.vn", "old-hash", "0901234567", UserStatus.SUSPENDED);
        existing.setId(9L);
        existing.setEmailVerified(false);
        when(users.findFirstByEmailIgnoreCaseOrderByIdAsc("victim@x.vn"))
                .thenReturn(Optional.of(existing));
        when(encoder.encode("NewSecret-1")).thenReturn("new-hash");

        var challenge =
                otp.requestRegisterOtp(
                        new RegisterRequest(
                                "newname", "victim@x.vn", "NewSecret-1", "0912345678", null, null));
        assertEquals("victim", existing.getUsername());
        assertEquals("old-hash", existing.getPasswordHash());
        assertEquals("0901234567", existing.getPhoneNumber());
        assertEquals(UserStatus.SUSPENDED, existing.getStatus());
        verify(users, never()).save(existing);

        ArgumentCaptor<AuthOtpToken> saved = ArgumentCaptor.forClass(AuthOtpToken.class);
        verify(tokens).save(saved.capture());
        AuthOtpToken t = saved.getValue();
        assertEquals("newname", t.getPendingUsername());
        assertEquals("new-hash", t.getPendingPasswordHash());
        when(tokens.findByChallengeTokenForUpdate(challenge.challengeToken()))
                .thenReturn(Optional.of(t));
        when(encoder.matches("123456", "hash")).thenReturn(true);

        assertThrows(
                SystemException.class,
                () ->
                        otp.verifyEmailOtp(
                                new VerifyOtpRequest(
                                        challenge.challengeToken(), null, "123456", "EMAIL")));
        assertTrue(existing.isEmailVerified());
        assertEquals("newname", existing.getUsername());
        assertEquals("new-hash", existing.getPasswordHash());
        assertEquals(UserStatus.SUSPENDED, existing.getStatus());
        verifyNoInteractions(jwt);
    }
}
