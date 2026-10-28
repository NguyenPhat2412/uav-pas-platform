package com.uav.platform.modules.auth.service.impl;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.dto.record.IssuedChallenge;
import com.uav.platform.modules.auth.dto.record.PendingSignup;
import com.uav.platform.modules.auth.dto.record.RegistrationInput;
import com.uav.platform.modules.auth.dto.request.*;
import com.uav.platform.modules.auth.dto.response.*;
import com.uav.platform.modules.auth.entity.AuthOtpToken;
import com.uav.platform.modules.auth.entity.RefreshToken;
import com.uav.platform.modules.auth.enums.AuthRateLimitAction;
import com.uav.platform.modules.auth.mapper.AuthMapper;
import com.uav.platform.modules.auth.repository.AuthOtpTokenRepository;
import com.uav.platform.modules.auth.service.AuthMailService;
import com.uav.platform.modules.auth.service.AuthOtpService;
import com.uav.platform.modules.auth.service.AuthRateLimitService;
import com.uav.platform.modules.auth.service.AuthSessionLock;
import com.uav.platform.modules.auth.service.RefreshTokenService;
import com.uav.platform.modules.auth.service.SessionTerminationService;
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
import java.util.OptionalLong;
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

    /** Code hash of a login challenge that is answered with an authenticator code. */
    static final String TOTP_CHALLENGE = "TOTP_CHALLENGE";

    private static final int MAX_OTP_ATTEMPTS = 5;

    static final String RESET_SENT_MESSAGE =
            "Nếu email đã được đăng ký, mã OTP đặt lại mật khẩu đã được gửi tới hộp thư của bạn.";

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
    private AuthRateLimitService rateLimiter;
    private SessionTerminationService sessionTermination;
    private AuthSessionLock sessionLock;

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

    @Autowired(required = false)
    public void setRateLimiter(AuthRateLimitService rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Autowired(required = false)
    public void setSessionTermination(SessionTerminationService sessionTermination) {
        this.sessionTermination = sessionTermination;
    }

    @Autowired(required = false)
    public void setSessionLock(AuthSessionLock sessionLock) {
        this.sessionLock = sessionLock;
    }

    @Override
    public OtpChallengeResponse requestRegisterOtp(RegisterRequest request) {
        RegistrationInput in = RegistrationOperations.normalize(request);
        limitAccount(AuthRateLimitAction.OTP_ISSUE, in.email());
        Optional<AppUser> existingByEmail =
                userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc(in.email());
        IssuedChallenge issued;
        AppUser targetUser;

        if (existingByEmail.isPresent()) {
            // An unverified sign-up may be restarted; the new OTP invalidates every earlier one, so
            // only the person who reads this email AND holds this latest challenge can finish it.
            // The new details wait on the challenge and replace the account's only after the
            // code proves the email; the account's status is never reset here.
            AppUser existing = existingByEmail.get();
            if (existing.isEmailVerified()) {
                throw SystemException.conflict(
                                RegistrationOperations.TAKEN_EMAIL, "REGISTER_EMAIL_TAKEN")
                        .at("email");
            }
            if (!existing.getUsername().equalsIgnoreCase(in.username())
                    && userRepository.existsByUsernameIgnoreCase(in.username())) {
                throw SystemException.conflict(
                                RegistrationOperations.TAKEN_USERNAME, "REGISTER_USERNAME_TAKEN")
                        .at("username");
            }
            if (!in.phoneNumber().equals(existing.getPhoneNumber())
                    && userRepository.existsByPhoneNumber(in.phoneNumber())) {
                throw SystemException.conflict(
                                RegistrationOperations.TAKEN_PHONE, "REGISTER_PHONE_TAKEN")
                        .at("phoneNumber");
            }
            targetUser = existing;
            issued =
                    issueOtpToken(
                            existing,
                            existing.getEmail(),
                            PURPOSE_REGISTER_VERIFY,
                            "Xác thực email đăng ký tài khoản",
                            new PendingSignup(
                                    in.username(),
                                    in.phoneNumber(),
                                    passwordEncoder.encode(request.password())));
        } else {
            if (userRepository.existsByUsernameIgnoreCase(in.username())) {
                throw SystemException.conflict(
                                RegistrationOperations.TAKEN_USERNAME, "REGISTER_USERNAME_TAKEN")
                        .at("username");
            }
            if (userRepository.existsByPhoneNumber(in.phoneNumber())) {
                throw SystemException.conflict(
                                RegistrationOperations.TAKEN_PHONE, "REGISTER_PHONE_TAKEN")
                        .at("phoneNumber");
            }
            AppUser newUser =
                    UserAccountServiceImpl.createUser(
                            in.username(),
                            in.email(),
                            passwordEncoder.encode(request.password()),
                            in.phoneNumber(),
                            null,
                            null,
                            null,
                            in.role(),
                            in.status());
            newUser.setEmailVerified(false);
            newUser.setTwoFactorEnabled(false);
            newUser.setTwoFactorMethod(METHOD_EMAIL);
            targetUser = userRepository.save(newUser);
            issued =
                    issueOtpToken(
                            targetUser,
                            targetUser.getEmail(),
                            PURPOSE_REGISTER_VERIFY,
                            "Xác thực email đăng ký tài khoản");
        }

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
        // Bound to the exact sign-up attempt: an email alone would match whoever restarted the
        // sign-up last.
        if (request.challengeToken() == null || request.challengeToken().isBlank()) {
            throw SystemException.badRequest(
                    "Phiên đăng ký không hợp lệ. Vui lòng đăng ký lại.",
                    "REGISTER_CHALLENGE_REQUIRED");
        }
        AuthOtpToken token =
                resolveActiveToken(request.challengeToken(), null, PURPOSE_REGISTER_VERIFY);
        limitAccount(AuthRateLimitAction.OTP_VERIFY, token.getEmail());
        verifyTokenCode(token, request.code());

        AppUser user = tokenUser(token);
        applyPendingSignup(user, token);
        user.setEmailVerified(true);
        UserAccountServiceImpl.resetFailedAttempts(user);
        if (RegistrationOperations.awaitsApproval(user)) {
            // Email confirmed, but a staff account opens only after an administrator activates it.
            userRepository.save(user);
            return new AuthResponse(
                    null,
                    null,
                    null,
                    userMapper.toResponse(user),
                    false,
                    "PENDING_APPROVAL",
                    null,
                    null,
                    null);
        }
        userRepository.save(user);
        // Proving the email never reopens an account an administrator suspended or deactivated.
        if (user.getStatus() != UserStatus.ACTIVE || user.isManualLocked()) {
            throw SystemException.badRequest(CoreConstants.ACCOUNT_INACTIVE);
        }
        return issueFullSession(user);
    }

    @Override
    public AuthResponse createLoginChallenge(AppUser user, String methodOverride) {
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

        // An account protected by an authenticator is only ever challenged for that authenticator:
        // falling back to an emailed code would make the email inbox the weaker second factor.
        if (usesTotp(user)) {
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
        // A login challenge exists only after a correct password, and is identified by its token.
        if (request.challengeToken() == null || request.challengeToken().isBlank()) {
            throw SystemException.badRequest(
                    "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
                    "AUTH_CHALLENGE_REQUIRED");
        }
        AuthOtpToken token = resolveActiveToken(request.challengeToken(), null, PURPOSE_LOGIN_2FA);
        limitAccount(AuthRateLimitAction.OTP_VERIFY, token.getEmail());
        AppUser user = lockUser(tokenUser(token));

        if (TOTP_CHALLENGE.equals(token.getCodeHash()) || usesTotp(user)) {
            if (!usesTotp(user)) {
                // The authenticator was removed after this challenge was issued.
                consume(token);
                throw SystemException.badRequest(
                        "Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.",
                        "AUTH_CHALLENGE_STALE");
            }
            if (!acceptTotp(user, user.getTotpSecret(), request.code())) {
                incrementChallengeAttempt(token);
                throw SystemException.unauthorized(
                        "Mã Google Authenticator (TOTP) không chính xác hoặc đã hết hạn.");
            }
            consume(token);
        } else {
            verifyTokenCode(token, request.code());
        }

        if (user.isManualLocked() || user.getStatus() != UserStatus.ACTIVE) {
            throw SystemException.badRequest(CoreConstants.ACCOUNT_INACTIVE);
        }
        UserAccountServiceImpl.resetFailedAttempts(user);
        userRepository.save(user);
        return issueFullSession(user);
    }

    @Override
    public OtpChallengeResponse resendOtp(ResendOtpRequest request) {
        if (request == null) {
            throw SystemException.badRequest("Thông tin yêu cầu gửi lại OTP không hợp lệ");
        }
        String requestedPurpose =
                request.purpose() != null && !request.purpose().isBlank()
                        ? request.purpose().trim().toUpperCase()
                        : null;
        String requestedEmail = request.email() != null ? request.email().trim() : null;

        if (request.challengeToken() == null || request.challengeToken().isBlank()) {
            // Without an existing challenge only a password reset may be started: a login code is
            // issued solely after a correct password, and sign-up codes belong to their sign-up.
            if (PURPOSE_REGISTER_VERIFY.equals(requestedPurpose)) {
                throw SystemException.badRequest(
                        "Phiên đăng ký không hợp lệ. Vui lòng đăng ký lại.",
                        "REGISTER_CHALLENGE_REQUIRED");
            }
            if (PURPOSE_PASSWORD_RESET.equals(requestedPurpose)
                    && requestedEmail != null
                    && !requestedEmail.isBlank()) {
                return passwordResetChallenge(requestedEmail);
            }
            throw SystemException.badRequest(
                    "Phiên xác thực không hợp lệ. Vui lòng bắt đầu lại.",
                    "AUTH_CHALLENGE_REQUIRED");
        }

        Optional<AuthOtpToken> found =
                otpTokenRepository.findByChallengeToken(request.challengeToken().trim());
        if (found.isEmpty()) {
            // Reset challenges of unknown emails must behave like real ones.
            if (PURPOSE_PASSWORD_RESET.equals(requestedPurpose)
                    && requestedEmail != null
                    && !requestedEmail.isBlank()) {
                return passwordResetChallenge(requestedEmail);
            }
            throw SystemException.badRequest(
                    "Phiên xác thực không tồn tại. Vui lòng bắt đầu lại.", "OTP_CHALLENGE_UNKNOWN");
        }
        AuthOtpToken prev = found.get();
        // A used or superseded challenge must not mint a new code: after a sign-up is restarted,
        // the earlier challenge would otherwise verify the account with the newer (possibly
        // someone else's) password.
        if (consumed(prev)) {
            throw SystemException.badRequest(
                    "Phiên xác thực này đã được dùng hoặc đã được thay bằng phiên mới. Vui lòng bắt đầu lại.",
                    "OTP_CHALLENGE_SUPERSEDED");
        }
        String purpose = prev.getPurpose();
        if (PURPOSE_PASSWORD_RESET.equals(purpose)) {
            return passwordResetChallenge(prev.getEmail());
        }

        AppUser user = prev.getUser();
        String email = prev.getEmail();
        if (user == null && email != null && !email.isBlank()) {
            user = userRepository.findByEmail(email).orElse(null);
        }
        if (user == null || email == null || email.isBlank()) {
            throw SystemException.notFound("Không tìm thấy phiên xác thực hoặc tài khoản email");
        }
        if (PURPOSE_LOGIN_2FA.equals(purpose)) {
            if (TOTP_CHALLENGE.equals(prev.getCodeHash()) || usesTotp(user)) {
                throw SystemException.badRequest(
                        "Tài khoản này xác thực bằng Google Authenticator. Vui lòng nhập mã 6 số từ ứng dụng.",
                        "AUTH_2FA_TOTP_REQUIRED");
            }
            // A login challenge is renewed only while it is alive; afterwards sign in again.
            if (expired(prev)) {
                throw SystemException.badRequest(
                        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
                        "OTP_CHALLENGE_EXPIRED");
            }
        }
        limitAccount(AuthRateLimitAction.OTP_ISSUE, email);
        checkCooldown(email, purpose);

        String label =
                switch (purpose) {
                    case PURPOSE_REGISTER_VERIFY -> "Xác thực email đăng ký tài khoản";
                    case PURPOSE_ENABLE_2FA_EMAIL -> "Kích hoạt bảo mật 2 lớp (Email OTP)";
                    default -> "Xác thực đăng nhập 2 lớp (2FA Email OTP)";
                };

        // A restarted sign-up keeps its pending details across resends.
        PendingSignup pending =
                PURPOSE_REGISTER_VERIFY.equals(purpose)
                                && (prev.getPendingUsername() != null
                                        || prev.getPendingPhoneNumber() != null
                                        || prev.getPendingPasswordHash() != null)
                        ? new PendingSignup(
                                prev.getPendingUsername(),
                                prev.getPendingPhoneNumber(),
                                prev.getPendingPasswordHash())
                        : null;
        IssuedChallenge issued = issueOtpToken(user, user.getEmail(), purpose, label, pending);
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
        return passwordResetChallenge(request.email().trim());
    }

    /**
     * Same answer whether or not the email has an account, so the endpoint cannot be used to list
     * accounts. Unknown emails get a stand-in challenge that no code can ever satisfy.
     */
    private OtpChallengeResponse passwordResetChallenge(String email) {
        limitAccount(AuthRateLimitAction.OTP_ISSUE, email);
        checkCooldown(email, PURPOSE_PASSWORD_RESET);
        AppUser user =
                userRepository
                        .findByEmail(email)
                        .or(() -> userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc(email))
                        .orElse(null);
        IssuedChallenge issued =
                user != null
                        ? issueOtpToken(
                                user,
                                user.getEmail(),
                                PURPOSE_PASSWORD_RESET,
                                "Khôi phục mật khẩu tài khoản")
                        : issueDecoyResetToken(email);
        return new OtpChallengeResponse(
                issued.challengeToken(),
                email,
                AuthMailService.maskEmail(email),
                PURPOSE_PASSWORD_RESET,
                METHOD_EMAIL,
                otpTtlMinutes * 60,
                RESET_SENT_MESSAGE,
                issued.devOtpPreview());
    }

    @Override
    @Transactional(noRollbackFor = SystemException.class)
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        if (request == null || request.code() == null) {
            throw SystemException.badRequest("Thông tin đặt lại mật khẩu không hợp lệ");
        }
        RegistrationOperations.checkPassword(
                request.newPassword(), request.confirmPassword(), "newPassword", "confirmPassword");
        AuthOtpToken token =
                resolveActiveToken(
                        request.challengeToken(), request.email(), PURPOSE_PASSWORD_RESET);
        limitAccount(AuthRateLimitAction.OTP_VERIFY, token.getEmail());
        verifyTokenCode(token, request.code());

        AppUser user = tokenUser(token);
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setEmailVerified(true);
        UserAccountServiceImpl.resetFailedAttempts(user);
        userRepository.save(user);
        // Whoever held the old password must not keep a session.
        terminateSessions(user, "PASSWORD_RESET");

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
            // Kept as pending: the authenticator in use keeps working until a code from the new
            // one is confirmed in enable2fa.
            String secret = totpService.generateSecret();
            user.setPendingTotpSecret(secret);
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
            String pending = user.getPendingTotpSecret();
            if (pending == null || pending.isBlank()) {
                throw SystemException.badRequest(
                        "Chưa khởi tạo khóa TOTP. Vui lòng bấm Thiết lập 2FA trước.");
            }
            OptionalLong step = totpService.matchStep(pending, request.code());
            if (step.isEmpty()) {
                throw SystemException.badRequest(
                        "Mã xác thực từ ứng dụng Authenticator không chính xác.");
            }
            user.setTotpSecret(pending);
            user.setPendingTotpSecret(null);
            user.setTotpLastStep(step.getAsLong());
            user.setTwoFactorEnabled(true);
            user.setTwoFactorMethod(METHOD_TOTP);
            user.setEmailVerified(true);
            userRepository.save(user);
            return to2faStatus(user);
        }

        AuthOtpToken token =
                resolveActiveToken(
                        request.challengeToken(), user.getEmail(), PURPOSE_ENABLE_2FA_EMAIL);
        if (token.getEmail() == null || !token.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw SystemException.badRequest(
                    "Phiên xác thực không hợp lệ cho thao tác này. Vui lòng bắt đầu lại.",
                    "OTP_CHALLENGE_PURPOSE_MISMATCH");
        }
        verifyTokenCode(token, request.code());
        user.setTwoFactorEnabled(true);
        user.setTwoFactorMethod(METHOD_EMAIL);
        user.setEmailVerified(true);
        userRepository.save(user);
        return to2faStatus(user);
    }

    @Override
    public TwoFactorStatusResponse disable2fa(String username, TwoFactorDisableRequest request) {
        AppUser user = lockUser(requireUser(username));
        limitAccount(AuthRateLimitAction.OTP_VERIFY, "2fa-disable:" + user.getUsername());
        String password = request != null ? request.password() : null;
        String code = request != null ? request.code() : null;
        // A stolen session alone must not be able to strip the second factor.
        if (password != null && !password.isBlank()) {
            if (user.getPasswordHash() == null
                    || !passwordEncoder.matches(password, user.getPasswordHash())) {
                throw SystemException.badRequest(
                        "Mật khẩu xác nhận không chính xác", "AUTH_2FA_DISABLE_PASSWORD_INVALID");
            }
        } else if (code != null && !code.isBlank()) {
            if (!usesTotp(user) || !acceptTotp(user, user.getTotpSecret(), code)) {
                throw SystemException.badRequest(
                        "Mã xác thực 2FA không chính xác hoặc đã hết hạn.",
                        "AUTH_2FA_DISABLE_CODE_INVALID");
            }
        } else {
            throw SystemException.badRequest(
                    "Vui lòng nhập mật khẩu hiện tại để tắt xác thực 2 lớp.",
                    "AUTH_2FA_DISABLE_CONFIRM_REQUIRED");
        }
        user.setTwoFactorEnabled(false);
        user.setTwoFactorMethod(METHOD_EMAIL);
        user.setPendingTotpSecret(null);
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

    private AppUser tokenUser(AuthOtpToken token) {
        AppUser user = token.getUser();
        if (user != null) return user;
        return userRepository
                .findByEmail(token.getEmail())
                .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
    }

    /** Serializes code checks per account (TOTP replay tracking, refresh rotation). */
    private AppUser lockUser(AppUser user) {
        if (sessionLock == null || user.getId() == null) return user;
        return sessionLock.lock(user);
    }

    static boolean usesTotp(AppUser user) {
        return METHOD_TOTP.equalsIgnoreCase(user.getTwoFactorMethod())
                && user.getTotpSecret() != null
                && !user.getTotpSecret().isBlank();
    }

    /** Accepts a TOTP code once: a code from an already used (or older) time step is a replay. */
    private boolean acceptTotp(AppUser user, String secret, String code) {
        OptionalLong step = totpService.matchStep(secret, code);
        if (step.isEmpty()) return false;
        Long last = user.getTotpLastStep();
        if (last != null && step.getAsLong() <= last) return false;
        user.setTotpLastStep(step.getAsLong());
        return true;
    }

    private void applyPendingSignup(AppUser user, AuthOtpToken token) {
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

    private void terminateSessions(AppUser user, String reason) {
        if (sessionTermination != null) {
            sessionTermination.terminateAll(user, reason);
        } else if (refreshTokenService != null) {
            refreshTokenService.deleteByUser(user);
        }
    }

    private void limitAccount(AuthRateLimitAction action, String key) {
        if (rateLimiter != null) rateLimiter.checkAccount(action, key);
    }

    private void checkCooldown(String email, String purpose) {
        if (rateLimiter != null) rateLimiter.checkResendCooldown(cooldownKey(email, purpose));
    }

    private static String cooldownKey(String email, String purpose) {
        return purpose + "|" + (email == null ? "" : email.trim());
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
        token.setCodeHash(TOTP_CHALLENGE);
        token.setChallengeToken(UUID.randomUUID().toString());
        token.setAttempts(0);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(otpTtlMinutes));
        return otpTokenRepository.save(token);
    }

    private IssuedChallenge issueOtpToken(
            AppUser user, String email, String purpose, String emailPurposeLabel) {
        return issueOtpToken(user, email, purpose, emailPurposeLabel, null);
    }

    private IssuedChallenge issueOtpToken(
            AppUser user,
            String email,
            String purpose,
            String emailPurposeLabel,
            PendingSignup pending) {
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
        if (pending != null) {
            token.setPendingUsername(pending.username());
            token.setPendingPhoneNumber(pending.phoneNumber());
            token.setPendingPasswordHash(pending.passwordHash());
        }
        otpTokenRepository.save(token);

        authMailService.sendOtpEmail(email, emailPurposeLabel, rawCode, otpTtlMinutes);
        if (rateLimiter != null) rateLimiter.startResendCooldown(cooldownKey(email, purpose));
        String devPreview = authMailService.revealsOtp() ? rawCode : null;
        return new IssuedChallenge(challengeToken, devPreview);
    }

    /**
     * Stand-in reset challenge for an email without an account: stored like a real one (so resend,
     * attempts and expiry behave the same) but its hash is of a random secret no 6-digit code can
     * match, and no email is sent.
     */
    /** A random value no 6-digit code can match; short enough for BCrypt (max 72 bytes). */
    static String decoyResetSecret() {
        return "decoy-" + UUID.randomUUID();
    }

    private IssuedChallenge issueDecoyResetToken(String email) {
        invalidateExistingTokens(email, PURPOSE_PASSWORD_RESET);
        String challengeToken = UUID.randomUUID().toString();
        AuthOtpToken token = new AuthOtpToken();
        token.setUser(null);
        token.setEmail(email);
        token.setPurpose(PURPOSE_PASSWORD_RESET);
        // BCrypt rejects inputs over 72 bytes, so the never-matching secret stays one UUID long.
        token.setCodeHash(passwordEncoder.encode(decoyResetSecret()));
        token.setChallengeToken(challengeToken);
        token.setAttempts(0);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(otpTtlMinutes));
        otpTokenRepository.save(token);
        if (rateLimiter != null) {
            rateLimiter.startResendCooldown(cooldownKey(email, PURPOSE_PASSWORD_RESET));
        }
        String devPreview =
                authMailService.revealsOtp()
                        ? String.format("%06d", secureRandom.nextInt(1_000_000))
                        : null;
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

    /**
     * Loads the challenge with a row lock and checks it is alive and was issued for this purpose:
     * a reset, sign-up or 2FA-enable code must never answer a login challenge (or vice versa).
     */
    private AuthOtpToken resolveActiveToken(
            String challengeToken, String email, String expectedPurpose) {
        Optional<AuthOtpToken> candidate = Optional.empty();
        if (challengeToken != null && !challengeToken.isBlank()) {
            candidate = otpTokenRepository.findByChallengeTokenForUpdate(challengeToken.trim());
        } else if (email != null && !email.isBlank()) {
            candidate =
                    otpTokenRepository
                            .findFirstByEmailIgnoreCaseAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                                    email.trim(), expectedPurpose)
                            .flatMap(
                                    t ->
                                            otpTokenRepository.findByChallengeTokenForUpdate(
                                                    t.getChallengeToken()));
        }
        AuthOtpToken token =
                candidate.orElseThrow(
                        () ->
                                SystemException.badRequest(
                                        "Phiên xác thực OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu gửi lại mã."));
        if (!expectedPurpose.equals(token.getPurpose())) {
            throw PURPOSE_REGISTER_VERIFY.equals(expectedPurpose)
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
        if (token.getAttempts() >= MAX_OTP_ATTEMPTS) {
            throw SystemException.badRequest(
                    "Bạn đã nhập sai OTP quá số lần cho phép. Vui lòng yêu cầu gửi mã mới.");
        }
        return token;
    }

    private void verifyTokenCode(AuthOtpToken token, String rawCode) {
        String normalized = rawCode != null ? rawCode.trim() : "";
        if (TOTP_CHALLENGE.equals(token.getCodeHash())
                || !passwordEncoder.matches(normalized, token.getCodeHash())) {
            incrementChallengeAttempt(token);
            throw SystemException.unauthorized("Mã xác thực OTP không chính xác.");
        }
        consume(token);
    }

    private void consume(AuthOtpToken token) {
        token.setConsumedAt(LocalDateTime.now());
        otpTokenRepository.save(token);
    }

    /** Safe to read-modify-write: the token row is locked by resolveActiveToken. */
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
