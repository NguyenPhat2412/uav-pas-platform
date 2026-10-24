package com.uav.platform.modules.auth.service.impl;

import com.uav.platform.modules.auth.dto.record.IssuedChallenge;
import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.dto.request.*;
import com.uav.platform.modules.auth.dto.response.*;
import com.uav.platform.modules.auth.entity.AuthOtpToken;
import com.uav.platform.modules.auth.entity.RefreshToken;
import com.uav.platform.modules.auth.mapper.AuthMapper;
import com.uav.platform.modules.auth.repository.AuthOtpTokenRepository;
import com.uav.platform.modules.auth.service.AuthMailService;
import com.uav.platform.modules.auth.service.AuthOtpService;
import com.uav.platform.modules.auth.service.RefreshTokenService;
import com.uav.platform.modules.auth.service.TotpService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.mapper.UserMapper;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.impl.UserAccountServiceImpl;
import com.uav.platform.security.jwt.JwtTokenProvider;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class AuthOtpServiceImpl implements AuthOtpService {

    public static final String PURPOSE_REGISTER_VERIFY = "REGISTER_VERIFY";
    public static final String PURPOSE_LOGIN_2FA = "LOGIN_2FA";
    public static final String PURPOSE_PASSWORD_RESET = "PASSWORD_RESET";
    public static final String PURPOSE_ENABLE_2FA_EMAIL = "ENABLE_2FA_EMAIL";

    public static final String METHOD_EMAIL = "EMAIL";
    public static final String METHOD_TOTP = "TOTP";
    public static final String METHOD_EMAIL_VERIFY = "EMAIL_VERIFY";

    private static final int MAX_OTP_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final AuthOtpTokenRepository otpTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final AuthMailService authMailService;
    private final TotpService totpService;
    private final AuthMapper authMapper;
    private final UserMapper userMapper;
    private final int otpTtlMinutes;
    private final SecureRandom secureRandom = new SecureRandom();

    @Autowired
    public AuthOtpServiceImpl(
            UserRepository userRepository,
            AuthOtpTokenRepository otpTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            @Autowired(required = false) RefreshTokenService refreshTokenService,
            AuthMailService authMailService,
            TotpService totpService,
            AuthMapper authMapper,
            UserMapper userMapper,
            @Value("${app.auth.otp-ttl-minutes:10}") int otpTtlMinutes) {
        this.userRepository = userRepository;
        this.otpTokenRepository = otpTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.refreshTokenService = refreshTokenService;
        this.authMailService = authMailService;
        this.totpService = totpService;
        this.authMapper = authMapper;
        this.userMapper = userMapper;
        this.otpTtlMinutes = otpTtlMinutes > 0 ? otpTtlMinutes : 10;
    }

    @Override
    public OtpChallengeResponse requestRegisterOtp(RegisterRequest request) {
        if (request == null) {
            throw SystemException.badRequest(CoreConstants.REGISTRATION_DATA_REQUIRED);
        }

        String email = request.email() != null ? request.email().trim() : "";
        String username = request.username() != null ? request.username().trim() : "";
        String phoneNumber = request.phoneNumber() != null ? request.phoneNumber().trim() : "";

        Optional<AppUser> existingByEmail = userRepository.findByEmail(email);
        AppUser targetUser;

        if (existingByEmail.isPresent()) {
            AppUser existing = existingByEmail.get();
            if (existing.isEmailVerified()) {
                throw SystemException.conflict(CoreConstants.EMAIL_ALREADY_EXISTS);
            }
            if (!existing.getUsername().equalsIgnoreCase(username)
                    && userRepository.existsByUsername(username)) {
                throw SystemException.conflict(CoreConstants.USERNAME_ALREADY_EXISTS);
            }
            if ((existing.getPhoneNumber() == null
                            || !existing.getPhoneNumber().equals(phoneNumber))
                    && userRepository.existsByPhoneNumber(phoneNumber)) {
                throw SystemException.conflict(CoreConstants.PHONE_ALREADY_EXISTS);
            }
            existing.setUsername(username);
            existing.setPhoneNumber(phoneNumber);
            existing.setPasswordHash(passwordEncoder.encode(request.password()));
            existing.setEmailVerified(false);
            targetUser = userRepository.save(existing);
        } else {
            if (userRepository.existsByUsername(username)) {
                throw SystemException.conflict(CoreConstants.USERNAME_ALREADY_EXISTS);
            }
            if (userRepository.existsByPhoneNumber(phoneNumber)) {
                throw SystemException.conflict(CoreConstants.PHONE_ALREADY_EXISTS);
            }
            AppUser newUser =
                    UserAccountServiceImpl.createUser(
                            username,
                            email,
                            passwordEncoder.encode(request.password()),
                            phoneNumber,
                            null,
                            null,
                            null,
                            null,
                            UserStatus.ACTIVE);
            newUser.setEmailVerified(false);
            newUser.setTwoFactorEnabled(false);
            newUser.setTwoFactorMethod(METHOD_EMAIL);
            targetUser = userRepository.save(newUser);
        }

        IssuedChallenge issued =
                issueOtpToken(
                        targetUser,
                        targetUser.getEmail(),
                        PURPOSE_REGISTER_VERIFY,
                        "Xác thực email đăng ký tài khoản");

        return new OtpChallengeResponse(
                issued.challengeToken(),
                targetUser.getEmail(),
                AuthMailService.maskEmail(targetUser.getEmail()),
                PURPOSE_REGISTER_VERIFY,
                METHOD_EMAIL,
                otpTtlMinutes * 60,
                "Mã xác thực OTP gồm 6 chữ số đã được gửi tới email của bạn.",
                issued.devOtpPreview());
    }

    @Override
    @Transactional(noRollbackFor = SystemException.class)
    public AuthResponse verifyEmailOtp(VerifyOtpRequest request) {
        if (request == null || request.code() == null || request.code().isBlank()) {
            throw SystemException.badRequest("Mã OTP là bắt buộc");
        }
        AuthOtpToken token =
                resolveActiveToken(
                        request.challengeToken(), request.email(), PURPOSE_REGISTER_VERIFY);
        verifyTokenCode(token, request.code());

        AppUser user = token.getUser();
        if (user == null) {
            user =
                    userRepository
                            .findByEmail(token.getEmail())
                            .orElseThrow(
                                    () -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
        }
        user.setEmailVerified(true);
        user.setStatus(UserStatus.ACTIVE);
        UserAccountServiceImpl.resetFailedAttempts(user);
        userRepository.save(user);

        return issueFullSession(user);
    }

    @Override
    public AuthResponse createLoginChallenge(AppUser user, String methodOverride) {
        String configuredMethod =
                user.getTwoFactorMethod() != null ? user.getTwoFactorMethod() : METHOD_EMAIL;
        String activeMethod =
                (methodOverride != null && !methodOverride.isBlank())
                        ? methodOverride.trim().toUpperCase()
                        : configuredMethod.toUpperCase();

        if (!user.isEmailVerified()) {
            IssuedChallenge issued =
                    issueOtpToken(
                            user,
                            user.getEmail(),
                            PURPOSE_REGISTER_VERIFY,
                            "Xác thực địa chỉ Email tài khoản");
            return AuthResponse.challenge(
                    METHOD_EMAIL_VERIFY,
                    issued.challengeToken(),
                    AuthMailService.maskEmail(user.getEmail()),
                    issued.devOtpPreview(),
                    userMapper.toResponse(user));
        }

        if (METHOD_TOTP.equals(activeMethod)
                && user.getTotpSecret() != null
                && !user.getTotpSecret().isBlank()) {
            AuthOtpToken challenge = createTotpChallengeToken(user);
            return AuthResponse.challenge(
                    METHOD_TOTP,
                    challenge.getChallengeToken(),
                    AuthMailService.maskEmail(user.getEmail()),
                    null,
                    userMapper.toResponse(user));
        }

        IssuedChallenge issued =
                issueOtpToken(
                        user,
                        user.getEmail(),
                        PURPOSE_LOGIN_2FA,
                        "Xác thực đăng nhập 2 lớp (2FA Email OTP)");
        return AuthResponse.challenge(
                METHOD_EMAIL,
                issued.challengeToken(),
                AuthMailService.maskEmail(user.getEmail()),
                issued.devOtpPreview(),
                userMapper.toResponse(user));
    }

    @Override
    @Transactional(noRollbackFor = SystemException.class)
    public AuthResponse verifyLogin2fa(VerifyOtpRequest request) {
        if (request == null || request.code() == null || request.code().isBlank()) {
            throw SystemException.badRequest("Mã xác thực 2FA là bắt buộc");
        }
        AuthOtpToken token =
                resolveActiveToken(request.challengeToken(), request.email(), PURPOSE_LOGIN_2FA);
        AppUser user = token.getUser();
        if (user == null) {
            user =
                    userRepository
                            .findByEmail(token.getEmail())
                            .orElseThrow(
                                    () -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
        }

        String requestedMethod =
                request.method() != null
                        ? request.method().trim().toUpperCase()
                        : (user.getTwoFactorMethod() != null
                                ? user.getTwoFactorMethod().toUpperCase()
                                : METHOD_EMAIL);

        if ("TOTP_CHALLENGE".equals(token.getCodeHash()) || METHOD_TOTP.equals(requestedMethod)) {
            if (user.getTotpSecret() != null
                    && totpService.verifyCode(user.getTotpSecret(), request.code())) {
                token.setConsumedAt(LocalDateTime.now());
                otpTokenRepository.save(token);
                UserAccountServiceImpl.resetFailedAttempts(user);
                userRepository.save(user);
                return issueFullSession(user);
            }
            if (!"TOTP_CHALLENGE".equals(token.getCodeHash())) {
                verifyTokenCode(token, request.code());
                UserAccountServiceImpl.resetFailedAttempts(user);
                userRepository.save(user);
                return issueFullSession(user);
            }
            incrementChallengeAttempt(token);
            throw SystemException.unauthorized(
                    "Mã Google Authenticator (TOTP) không chính xác hoặc đã hết hạn.");
        }

        verifyTokenCode(token, request.code());
        UserAccountServiceImpl.resetFailedAttempts(user);
        userRepository.save(user);
        return issueFullSession(user);
    }

    @Override
    public OtpChallengeResponse resendOtp(ResendOtpRequest request) {
        if (request == null) {
            throw SystemException.badRequest("Thông tin yêu cầu gửi lại OTP không hợp lệ");
        }

        AppUser user = null;
        String email = request.email() != null ? request.email().trim() : null;
        String purpose =
                request.purpose() != null && !request.purpose().isBlank()
                        ? request.purpose().trim().toUpperCase()
                        : PURPOSE_LOGIN_2FA;

        if (request.challengeToken() != null && !request.challengeToken().isBlank()) {
            Optional<AuthOtpToken> prev =
                    otpTokenRepository.findByChallengeToken(request.challengeToken().trim());
            if (prev.isPresent()) {
                user = prev.get().getUser();
                email = prev.get().getEmail();
                purpose = prev.get().getPurpose();
            }
        }

        if (user == null && email != null && !email.isBlank()) {
            user = userRepository.findByEmail(email).orElse(null);
        }
        if (user == null || email == null || email.isBlank()) {
            throw SystemException.notFound("Không tìm thấy phiên xác thực hoặc tài khoản email");
        }

        String label =
                switch (purpose) {
                    case PURPOSE_REGISTER_VERIFY -> "Xác thực email đăng ký tài khoản";
                    case PURPOSE_PASSWORD_RESET -> "Khôi phục mật khẩu tài khoản";
                    case PURPOSE_ENABLE_2FA_EMAIL -> "Kích hoạt bảo mật 2 lớp (Email OTP)";
                    default -> "Xác thực đăng nhập 2 lớp (2FA Email OTP)";
                };

        IssuedChallenge issued = issueOtpToken(user, user.getEmail(), purpose, label);
        return new OtpChallengeResponse(
                issued.challengeToken(),
                user.getEmail(),
                AuthMailService.maskEmail(user.getEmail()),
                purpose,
                METHOD_EMAIL,
                otpTtlMinutes * 60,
                "Đã gửi mã OTP mới tới email của bạn.",
                issued.devOtpPreview());
    }

    @Override
    public OtpChallengeResponse forgotPassword(ForgotPasswordRequest request) {
        if (request == null || request.email() == null || request.email().isBlank()) {
            throw SystemException.badRequest("Vui lòng nhập địa chỉ email");
        }
        String email = request.email().trim();
        AppUser user =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy tài khoản với địa chỉ email này"));

        IssuedChallenge issued =
                issueOtpToken(
                        user,
                        user.getEmail(),
                        PURPOSE_PASSWORD_RESET,
                        "Khôi phục mật khẩu tài khoản");

        return new OtpChallengeResponse(
                issued.challengeToken(),
                user.getEmail(),
                AuthMailService.maskEmail(user.getEmail()),
                PURPOSE_PASSWORD_RESET,
                METHOD_EMAIL,
                otpTtlMinutes * 60,
                "Mã OTP đặt lại mật khẩu đã được gửi tới email của bạn.",
                issued.devOtpPreview());
    }

    @Override
    @Transactional(noRollbackFor = SystemException.class)
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        if (request == null
                || request.code() == null
                || request.newPassword() == null
                || request.newPassword().length() < 8) {
            throw SystemException.badRequest("Thông tin đặt lại mật khẩu không hợp lệ");
        }
        AuthOtpToken token =
                resolveActiveToken(
                        request.challengeToken(), request.email(), PURPOSE_PASSWORD_RESET);
        verifyTokenCode(token, request.code());

        AppUser user = token.getUser();
        if (user == null) {
            user =
                    userRepository
                            .findByEmail(token.getEmail())
                            .orElseThrow(
                                    () -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setEmailVerified(true);
        UserAccountServiceImpl.resetFailedAttempts(user);
        userRepository.save(user);

        return new MessageResponse("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.");
    }

    @Override
    @Transactional(readOnly = true)
    public TwoFactorStatusResponse get2faStatus(String username) {
        AppUser user = requireUser(username);
        return to2faStatus(user);
    }

    @Override
    public TwoFactorSetupResponse setup2fa(String username, TwoFactorSetupRequest request) {
        AppUser user = requireUser(username);
        String method =
                request != null && request.method() != null && !request.method().isBlank()
                        ? request.method().trim().toUpperCase()
                        : METHOD_EMAIL;

        if (METHOD_TOTP.equals(method)) {
            String secret = totpService.generateSecret();
            user.setTotpSecret(secret);
            userRepository.save(user);
            String otpauthUri = totpService.buildOtpAuthUri(user.getEmail(), secret);
            return new TwoFactorSetupResponse(
                    METHOD_TOTP,
                    secret,
                    otpauthUri,
                    totpService.getIssuer(),
                    user.getEmail(),
                    null,
                    AuthMailService.maskEmail(user.getEmail()),
                    null,
                    "Quét mã QR bằng Google Authenticator hoặc nhập khóa bí mật, sau đó nhập mã 6 số để kích hoạt.");
        }

        IssuedChallenge issued =
                issueOtpToken(
                        user,
                        user.getEmail(),
                        PURPOSE_ENABLE_2FA_EMAIL,
                        "Kích hoạt bảo mật 2 lớp (Email OTP)");

        return new TwoFactorSetupResponse(
                METHOD_EMAIL,
                null,
                null,
                totpService.getIssuer(),
                user.getEmail(),
                issued.challengeToken(),
                AuthMailService.maskEmail(user.getEmail()),
                issued.devOtpPreview(),
                "Mã OTP xác nhận bật 2FA qua Email đã được gửi tới hộp thư của bạn.");
    }

    @Override
    @Transactional(noRollbackFor = SystemException.class)
    public TwoFactorStatusResponse enable2fa(String username, TwoFactorVerifyRequest request) {
        AppUser user = requireUser(username);
        if (request == null || request.code() == null || request.code().isBlank()) {
            throw SystemException.badRequest("Vui lòng nhập mã xác thực 6 chữ số");
        }
        String method =
                request.method() != null && !request.method().isBlank()
                        ? request.method().trim().toUpperCase()
                        : METHOD_EMAIL;

        if (METHOD_TOTP.equals(method)) {
            if (user.getTotpSecret() == null || user.getTotpSecret().isBlank()) {
                throw SystemException.badRequest(
                        "Chưa khởi tạo khóa TOTP. Vui lòng bấm Thiết lập 2FA trước.");
            }
            if (!totpService.verifyCode(user.getTotpSecret(), request.code())) {
                throw SystemException.badRequest(
                        "Mã xác thực từ ứng dụng Authenticator không chính xác.");
            }
            user.setTwoFactorEnabled(true);
            user.setTwoFactorMethod(METHOD_TOTP);
            user.setEmailVerified(true);
            userRepository.save(user);
            return to2faStatus(user);
        }

        AuthOtpToken token =
                resolveActiveToken(
                        request.challengeToken(), user.getEmail(), PURPOSE_ENABLE_2FA_EMAIL);
        verifyTokenCode(token, request.code());
        user.setTwoFactorEnabled(true);
        user.setTwoFactorMethod(METHOD_EMAIL);
        user.setEmailVerified(true);
        userRepository.save(user);
        return to2faStatus(user);
    }

    @Override
    public TwoFactorStatusResponse disable2fa(String username, TwoFactorDisableRequest request) {
        AppUser user = requireUser(username);
        if (request != null && request.password() != null && !request.password().isBlank()) {
            if (user.getPasswordHash() == null
                    || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
                throw SystemException.unauthorized("Mật khẩu xác nhận không chính xác");
            }
        }
        user.setTwoFactorEnabled(false);
        user.setTwoFactorMethod(METHOD_EMAIL);
        userRepository.save(user);
        return to2faStatus(user);
    }

    private AppUser requireUser(String username) {
        if (username == null || username.isBlank()) {
            throw SystemException.unauthorized("Authentication required");
        }
        return userRepository
                .findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
    }

    private TwoFactorStatusResponse to2faStatus(AppUser user) {
        return new TwoFactorStatusResponse(
                user.isTwoFactorEnabled(),
                user.getTwoFactorMethod() != null ? user.getTwoFactorMethod() : METHOD_EMAIL,
                user.isEmailVerified(),
                user.getTotpSecret() != null && !user.getTotpSecret().isBlank(),
                user.getEmail(),
                AuthMailService.maskEmail(user.getEmail()));
    }

    private AuthResponse issueFullSession(AppUser user) {
        String accessToken =
                jwtTokenProvider.generateToken(
                        user.getId(), user.getUsername(), user.getEmail(), user.getRole().name());
        String refreshTokenString = null;
        if (refreshTokenService != null) {
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
            refreshTokenString = refreshToken.getToken();
        }
        return authMapper.toResponse(accessToken, refreshTokenString, userMapper.toResponse(user));
    }

    private AuthOtpToken createTotpChallengeToken(AppUser user) {
        invalidateExistingTokens(user.getEmail(), PURPOSE_LOGIN_2FA);
        AuthOtpToken token = new AuthOtpToken();
        token.setUser(user);
        token.setEmail(user.getEmail());
        token.setPurpose(PURPOSE_LOGIN_2FA);
        token.setCodeHash("TOTP_CHALLENGE");
        token.setChallengeToken(UUID.randomUUID().toString());
        token.setAttempts(0);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(otpTtlMinutes));
        return otpTokenRepository.save(token);
    }

    private IssuedChallenge issueOtpToken(
            AppUser user, String email, String purpose, String emailPurposeLabel) {
        invalidateExistingTokens(email, purpose);
        String rawCode = String.format("%06d", secureRandom.nextInt(1_000_000));
        String challengeToken = UUID.randomUUID().toString();

        AuthOtpToken token = new AuthOtpToken();
        token.setUser(user);
        token.setEmail(email);
        token.setPurpose(purpose);
        token.setCodeHash(passwordEncoder.encode(rawCode));
        token.setChallengeToken(challengeToken);
        token.setAttempts(0);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(otpTtlMinutes));
        otpTokenRepository.save(token);

        authMailService.sendOtpEmail(email, emailPurposeLabel, rawCode, otpTtlMinutes);
        String devPreview = authMailService.revealsOtp() ? rawCode : null;
        return new IssuedChallenge(challengeToken, devPreview);
    }

    private void invalidateExistingTokens(String email, String purpose) {
        List<AuthOtpToken> active =
                otpTokenRepository.findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(
                        email, purpose);
        LocalDateTime now = LocalDateTime.now();
        for (AuthOtpToken existing : active) {
            existing.setConsumedAt(now);
        }
        if (!active.isEmpty()) {
            otpTokenRepository.saveAll(active);
        }
    }

    private AuthOtpToken resolveActiveToken(
            String challengeToken, String email, String expectedPurpose) {
        Optional<AuthOtpToken> candidate = Optional.empty();
        if (challengeToken != null && !challengeToken.isBlank()) {
            candidate = otpTokenRepository.findByChallengeToken(challengeToken.trim());
        }
        if (candidate.isEmpty() && email != null && !email.isBlank()) {
            candidate =
                    otpTokenRepository
                            .findFirstByEmailIgnoreCaseAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                                    email.trim(), expectedPurpose);
        }
        AuthOtpToken token =
                candidate.orElseThrow(
                        () ->
                                SystemException.badRequest(
                                        "Phiên xác thực OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu gửi lại mã."));
        if (consumed(token)) {
            throw SystemException.badRequest(
                    "Mã OTP này đã được sử dụng. Vui lòng yêu cầu gửi mã mới.");
        }
        if (expired(token)) {
            throw SystemException.badRequest(
                    "Mã OTP đã hết hạn hiệu lực. Vui lòng bấm Gửi lại mã.");
        }
        if (token.getAttempts() >= MAX_OTP_ATTEMPTS) {
            throw SystemException.badRequest(
                    "Bạn đã nhập sai OTP quá số lần cho phép. Vui lòng yêu cầu gửi mã mới.");
        }
        return token;
    }

    private void verifyTokenCode(AuthOtpToken token, String rawCode) {
        String normalized = rawCode != null ? rawCode.trim() : "";
        if (!passwordEncoder.matches(normalized, token.getCodeHash())) {
            incrementChallengeAttempt(token);
            throw SystemException.unauthorized("Mã xác thực OTP không chính xác.");
        }
        token.setConsumedAt(LocalDateTime.now());
        otpTokenRepository.save(token);
    }

    private void incrementChallengeAttempt(AuthOtpToken token) {
        token.setAttempts(token.getAttempts() + 1);
        if (token.getAttempts() >= MAX_OTP_ATTEMPTS) {
            token.setConsumedAt(LocalDateTime.now());
        }
        otpTokenRepository.save(token);
    }

    private static boolean expired(AuthOtpToken token) {
        return token.getExpiresAt() == null || LocalDateTime.now().isAfter(token.getExpiresAt());
    }

    private static boolean consumed(AuthOtpToken token) {
        return token.getConsumedAt() != null;
    }
}
