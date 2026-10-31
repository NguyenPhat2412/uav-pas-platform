package com.uav.platform.service.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.auth.RegisterRequest;
import com.uav.platform.dto.request.auth.ResendOtpRequest;
import com.uav.platform.dto.request.auth.VerifyOtpRequest;
import com.uav.platform.entity.auth.AuthOtpToken;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.auth.AuthMapper;
import com.uav.platform.mapper.user.UserMapper;
import com.uav.platform.repository.auth.AuthOtpTokenRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.security.jwt.JwtTokenProvider;
import com.uav.platform.service.impl.auth.AuthOtpServiceImpl;
import com.uav.platform.service.impl.auth.RegistrationOperations;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class RegistrationSafetyTest {
    private static RegisterRequest req(
            String user, String email, String phone, String password, String role) {
        return new RegisterRequest(user, email, password, phone, role, null);
    }

    private static SystemException error(Runnable r) {
        return assertThrows(SystemException.class, r::run);
    }

    private static String code(Runnable r) {
        return assertThrows(SystemException.class, r::run).getCode();
    }

    @Test
    void normalisesEmailAndVietnamesePhoneFormats() {
        var in =
                RegistrationOperations.normalize(
                        req(
                                " pilot.vju ",
                                " Pilot@VJU.Edu.VN ",
                                "+84 901-234.567",
                                "secret123",
                                null));
        assertEquals("pilot.vju", in.username());
        assertEquals("pilot@vju.edu.vn", in.email());
        assertEquals("0901234567", in.phoneNumber());
        assertEquals(UserRole.ROLE_PILOT, in.role());
        assertEquals(UserStatus.ACTIVE, in.status());
        assertEquals(
                "0901234567",
                RegistrationOperations.normalize(
                                req("abc", "a@b.co", "(090) 123 4567", "secret123", "CUSTOMER"))
                        .phoneNumber());
        assertEquals(
                "02439876543",
                RegistrationOperations.normalize(
                                req("abc", "a@b.co", "84 24 3987 6543", "secret123", null))
                        .phoneNumber());
    }

    @Test
    void rejectsBadUsernamesPhonesPasswordsAndRoles() {
        assertEquals(
                "REGISTER_USERNAME_INVALID",
                code(
                        () ->
                                RegistrationOperations.normalize(
                                        req(
                                                "qa reg@x",
                                                "a@b.co",
                                                "0901234567",
                                                "secret123",
                                                null))));
        assertEquals(
                "REGISTER_USERNAME_INVALID",
                code(
                        () ->
                                RegistrationOperations.normalize(
                                        req("nguyễn", "a@b.co", "0901234567", "secret123", null))));
        assertEquals(
                "REGISTER_USERNAME_RESERVED",
                code(
                        () ->
                                RegistrationOperations.normalize(
                                        req("ADMIN", "a@b.co", "0901234567", "secret123", null))));
        for (String phone :
                List.of(
                        "abc",
                        "12345",
                        "0123456789012345678901234",
                        "+1 415 555 0100",
                        "1901234567"))
            assertEquals(
                    "REGISTER_PHONE_INVALID",
                    code(
                            () ->
                                    RegistrationOperations.normalize(
                                            req("abc", "a@b.co", phone, "secret123", null))),
                    phone);
        // 30 Vietnamese characters are 60+ bytes; 40 of them pass 72 bytes even though they are
        // under 72 characters.
        assertEquals(
                "REGISTER_PASSWORD_TOO_LONG",
                code(
                        () ->
                                RegistrationOperations.normalize(
                                        req("abc", "a@b.co", "0901234567", "ẫ".repeat(40), null))));
        assertEquals(
                "REGISTER_PASSWORD_TOO_SHORT",
                code(
                        () ->
                                RegistrationOperations.normalize(
                                        req("abc", "a@b.co", "0901234567", "   abc     ", null))));
        assertEquals(
                "REGISTER_ROLE_INVALID",
                code(
                        () ->
                                RegistrationOperations.normalize(
                                        req(
                                                "abc",
                                                "a@b.co",
                                                "0901234567",
                                                "secret123",
                                                "ROLE_ADMIN"))));
    }

    @Test
    void operationsStaffCannotSelfRegister() {
        for (String staffRole : List.of("OPERATOR", "ROLE_OPERATOR")) {
            assertEquals(
                    "REGISTER_ROLE_STAFF_BY_INVITATION",
                    code(
                            () ->
                                    RegistrationOperations.normalize(
                                            req(
                                                    "ops.one",
                                                    "ops@x.vn",
                                                    "0901234567",
                                                    "secret123",
                                                    staffRole))));
        }
    }

    // ---- OTP flow ----
    final UserRepository users = mock(UserRepository.class);
    final AuthOtpTokenRepository tokens = mock(AuthOtpTokenRepository.class);
    final PasswordEncoder encoder = mock(PasswordEncoder.class);
    final AuthOtpServiceImpl otp;

    RegistrationSafetyTest() {
        when(encoder.encode(anyString())).thenReturn("hash");
        when(encoder.matches(anyString(), anyString())).thenReturn(true);
        when(tokens.findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(anyString(), anyString()))
                .thenReturn(List.of());
        otp =
                new AuthOtpServiceImpl(
                        users,
                        tokens,
                        encoder,
                        mock(JwtTokenProvider.class),
                        null,
                        new AuthMailService(null, false, "no-reply@test", false),
                        mock(TotpService.class),
                        mock(AuthMapper.class),
                        mock(UserMapper.class),
                        10);
    }

    private AuthOtpToken token(AppUser user, boolean consumed) {
        AuthOtpToken t = new AuthOtpToken();
        t.setUser(user);
        t.setEmail(user.getEmail());
        t.setPurpose("REGISTER_VERIFY");
        t.setCodeHash("hash");
        t.setChallengeToken("old-challenge");
        t.setAttempts(0);
        t.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        if (consumed) t.setConsumedAt(LocalDateTime.now());
        return t;
    }

    private AppUser pendingUser(UserRole role, UserStatus status) {
        AppUser u = new AppUser("victim", "victim@x.vn", "hash", "0901234567", status);
        u.setRole(role);
        u.setEmailVerified(false);
        return u;
    }

    @Test
    void aSupersededSignUpChallengeCannotMintANewCode() {
        AppUser u = pendingUser(UserRole.ROLE_PILOT, UserStatus.ACTIVE);
        when(tokens.findByChallengeToken("old-challenge")).thenReturn(Optional.of(token(u, true)));
        assertEquals(
                "OTP_CHALLENGE_SUPERSEDED",
                code(() -> otp.resendOtp(new ResendOtpRequest("old-challenge", null, null))));
        assertEquals(
                "REGISTER_CHALLENGE_REQUIRED",
                code(
                        () ->
                                otp.resendOtp(
                                        new ResendOtpRequest(
                                                null, "victim@x.vn", "REGISTER_VERIFY"))));
        assertEquals(
                "OTP_CHALLENGE_UNKNOWN",
                code(() -> otp.resendOtp(new ResendOtpRequest("made-up", null, null))));
        verify(tokens, never()).save(any());
    }

    @Test
    void emailVerificationNeedsTheChallengeNotJustTheEmail() {
        assertEquals(
                "REGISTER_CHALLENGE_REQUIRED",
                code(
                        () ->
                                otp.verifyEmailOtp(
                                        new VerifyOtpRequest(
                                                null, "victim@x.vn", "123456", "EMAIL"))));
    }

    @Test
    void verifiedStaffAccountStaysPendingWithoutASession() {
        AppUser u = pendingUser(UserRole.ROLE_OPERATOR, UserStatus.INACTIVE);
        when(tokens.findByChallengeTokenForUpdate("old-challenge"))
                .thenReturn(Optional.of(token(u, false)));
        var res =
                otp.verifyEmailOtp(new VerifyOtpRequest("old-challenge", null, "123456", "EMAIL"));
        assertNull(res.accessToken());
        assertEquals("PENDING_APPROVAL", res.mfaMethod());
        assertTrue(u.isEmailVerified());
        assertEquals(UserStatus.INACTIVE, u.getStatus());
    }

    @Test
    void everyRuleNamesTheFieldItBelongsTo() {
        assertEquals(
                "username",
                error(
                                () ->
                                        RegistrationOperations.normalize(
                                                req(
                                                        "a b",
                                                        "a@b.co",
                                                        "0901234567",
                                                        "secret123",
                                                        null)))
                        .getField());
        assertEquals(
                "phoneNumber",
                error(
                                () ->
                                        RegistrationOperations.normalize(
                                                req("abc", "a@b.co", "12", "secret123", null)))
                        .getField());
        assertEquals(
                "password",
                error(
                                () ->
                                        RegistrationOperations.normalize(
                                                req("abc", "a@b.co", "0901234567", "short", null)))
                        .getField());
        assertEquals(
                "role",
                error(
                                () ->
                                        RegistrationOperations.normalize(
                                                req(
                                                        "abc",
                                                        "a@b.co",
                                                        "0901234567",
                                                        "secret123",
                                                        "ADMIN")))
                        .getField());
        var mismatch =
                error(
                        () ->
                                RegistrationOperations.normalize(
                                        new RegisterRequest(
                                                "abc",
                                                "a@b.co",
                                                "secret123",
                                                "0901234567",
                                                null,
                                                "secret124")));
        assertEquals("REGISTER_PASSWORD_MISMATCH", mismatch.getCode());
        assertEquals("confirmPassword", mismatch.getField());
        // Without a confirmation (older API clients) only the password itself is checked.
        assertDoesNotThrow(
                () ->
                        RegistrationOperations.normalize(
                                req("abc", "a@b.co", "0901234567", "secret123", null)));
        assertEquals(
                "newPassword",
                error(
                                () ->
                                        RegistrationOperations.checkPassword(
                                                "short", null, "newPassword", "confirmPassword"))
                        .getField());
    }
}
