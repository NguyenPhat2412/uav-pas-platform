package com.uav.platform.service.impl;

import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.record.PendingSignup;
import com.uav.platform.dto.response.AuthResponse;
import com.uav.platform.dto.response.TwoFactorStatusResponse;
import com.uav.platform.dto.response.UserResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.AuthOtpToken;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.AuthMailService;

import java.time.LocalDateTime;
import java.util.UUID;

final class AuthOtpOperations {

    private AuthOtpOperations() {}

    static boolean usesTotp(AppUser user) {
        return AuthOtpServiceImpl.METHOD_TOTP.equalsIgnoreCase(user.getTwoFactorMethod())
                && user.getTotpSecret() != null
                && !user.getTotpSecret().isBlank();
    }

    static String cooldownKey(String email, String purpose) {
        return purpose + "|" + (email == null ? "" : email.trim());
    }

    static TwoFactorStatusResponse to2faStatus(AppUser user) {
        return new TwoFactorStatusResponse(
                user.isTwoFactorEnabled(),
                user.getTwoFactorMethod() != null
                        ? user.getTwoFactorMethod()
                        : AuthOtpServiceImpl.METHOD_EMAIL,
                user.isEmailVerified(),
                user.getTotpSecret() != null && !user.getTotpSecret().isBlank(),
                user.getEmail(),
                AuthMailService.maskEmail(user.getEmail()));
    }

    static AuthResponse pendingApprovalResponse(UserResponse userResponse) {
        return new AuthResponse(
                null, null, null, userResponse, false, "PENDING_APPROVAL", null, null, null);
    }

    static void applyPendingSignup(AppUser user, AuthOtpToken token, IUserDao userRepository) {
        String username = token.getPendingUsername();
        if (username != null && !username.equals(user.getUsername())) {
            if (!username.equalsIgnoreCase(user.getUsername())
                    && userRepository.existsByUsernameIgnoreCase(username)) {
                throw SystemException.conflict(
                                RegistrationOperations.TAKEN_USERNAME, "REGISTER_USERNAME_TAKEN")
                        .at("username");
            }
            user.setUsername(username);
        }
        String phone = token.getPendingPhoneNumber();
        if (phone != null && !phone.equals(user.getPhoneNumber())) {
            if (userRepository.existsByPhoneNumber(phone)) {
                throw SystemException.conflict(
                                RegistrationOperations.TAKEN_PHONE, "REGISTER_PHONE_TAKEN")
                        .at("phoneNumber");
            }
            user.setPhoneNumber(phone);
        }
        if (token.getPendingPasswordHash() != null) {
            user.setPasswordHash(token.getPendingPasswordHash());
        }
    }

    static AuthOtpToken buildTotpChallengeToken(AppUser user, int ttlMinutes) {
        AuthOtpToken token = new AuthOtpToken();
        token.setUser(user);
        token.setEmail(user.getEmail());
        token.setPurpose(AuthOtpServiceImpl.PURPOSE_LOGIN_2FA);
        token.setCodeHash(AuthOtpServiceImpl.TOTP_CHALLENGE);
        token.setChallengeToken(UUID.randomUUID().toString());
        token.setAttempts(0);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(ttlMinutes));
        return token;
    }

    static AuthOtpToken buildOtpToken(
            AppUser user,
            String email,
            String purpose,
            String encodedCode,
            String challengeToken,
            int ttlMinutes,
            PendingSignup pending) {
        AuthOtpToken token = new AuthOtpToken();
        token.setUser(user);
        token.setEmail(email);
        token.setPurpose(purpose);
        token.setCodeHash(encodedCode);
        token.setChallengeToken(challengeToken);
        token.setAttempts(0);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(ttlMinutes));
        if (pending != null) {
            token.setPendingUsername(pending.username());
            token.setPendingPhoneNumber(pending.phoneNumber());
            token.setPendingPasswordHash(pending.passwordHash());
        }
        return token;
    }

    static String decoyResetSecret() {
        return "decoy-" + UUID.randomUUID();
    }

    static AuthOtpToken buildDecoyResetToken(
            String email, String encodedSecret, String challengeToken, int ttlMinutes) {
        AuthOtpToken token = new AuthOtpToken();
        token.setUser(null);
        token.setEmail(email);
        token.setPurpose(AuthOtpServiceImpl.PURPOSE_PASSWORD_RESET);
        token.setCodeHash(encodedSecret);
        token.setChallengeToken(challengeToken);
        token.setAttempts(0);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(ttlMinutes));
        return token;
    }

    static void validateActiveToken(
            AuthOtpToken token, String expectedPurpose, int maxOtpAttempts) {
        if (!expectedPurpose.equals(token.getPurpose())) {
            throw AuthOtpServiceImpl.PURPOSE_REGISTER_VERIFY.equals(expectedPurpose)
                    ? SystemException.badRequest(
                            "Phiên đăng ký không hợp lệ. Vui lòng đăng ký lại.",
                            "REGISTER_CHALLENGE_REQUIRED")
                    : SystemException.badRequest(
                            "Phiên xác thực không hợp lệ cho thao tác này. Vui lòng bắt đầu lại.",
                            "OTP_CHALLENGE_PURPOSE_MISMATCH");
        }
        if (consumed(token)) {
            throw SystemException.badRequest(
                    "Mã OTP này đã được sử dụng. Vui lòng yêu cầu gửi mã mới.");
        }
        if (expired(token)) {
            throw SystemException.badRequest(
                    "Mã OTP đã hết hạn hiệu lực. Vui lòng bấm Gửi lại mã.");
        }
        if (token.getAttempts() >= maxOtpAttempts) {
            throw SystemException.badRequest(
                    "Bạn đã nhập sai OTP quá số lần cho phép. Vui lòng yêu cầu gửi mã mới.");
        }
    }

    static boolean expired(AuthOtpToken token) {
        return token.getExpiresAt() == null || LocalDateTime.now().isAfter(token.getExpiresAt());
    }

    static boolean consumed(AuthOtpToken token) {
        return token.getConsumedAt() != null;
    }
}
