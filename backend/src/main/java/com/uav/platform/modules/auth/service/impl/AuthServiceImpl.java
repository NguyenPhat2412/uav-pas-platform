package com.uav.platform.modules.auth.service.impl;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.dto.record.GoogleIdentity;
import com.uav.platform.modules.auth.dto.record.RegistrationInput;
import com.uav.platform.modules.auth.dto.request.GoogleLoginRequest;
import com.uav.platform.modules.auth.dto.request.LoginRequest;
import com.uav.platform.modules.auth.dto.request.RefreshTokenRequest;
import com.uav.platform.modules.auth.dto.request.RegisterRequest;
import com.uav.platform.modules.auth.dto.response.AuthResponse;
import com.uav.platform.modules.auth.entity.RefreshToken;
import com.uav.platform.modules.auth.enums.AuthRateLimitAction;
import com.uav.platform.modules.auth.mapper.AuthMapper;
import com.uav.platform.modules.auth.service.AuthRateLimitService;
import com.uav.platform.modules.auth.service.AuthService;
import com.uav.platform.modules.auth.service.GoogleIdTokenService;
import com.uav.platform.modules.auth.service.InvalidatedTokenService;
import com.uav.platform.modules.auth.service.RefreshTokenService;
import com.uav.platform.modules.user.dto.response.UserResponse;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.mapper.UserMapper;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.impl.UserAccountServiceImpl;
import com.uav.platform.security.jwt.JwtTokenProvider;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final InvalidatedTokenService invalidatedTokenService;
    private final com.uav.platform.modules.auth.service.AuthSessionLock sessionLock;
    private final AuthMapper authMapper;
    private final UserMapper userMapper;
    private com.uav.platform.modules.auth.service.AuthOtpService authOtpService;
    private AuthRateLimitService rateLimiter;
    private GoogleIdTokenService googleVerifier;
    private TransactionTemplate transactionTemplate;

    @Autowired(required = false)
    public void setAuthOtpService(
            com.uav.platform.modules.auth.service.AuthOtpService authOtpService) {
        this.authOtpService = authOtpService;
    }

    @Autowired(required = false)
    public void setRateLimiter(AuthRateLimitService rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    @Autowired(required = false)
    public void setGoogleIdTokenService(GoogleIdTokenService googleVerifier) {
        this.googleVerifier = googleVerifier;
    }

    @Autowired(required = false)
    public void setTransactionManager(PlatformTransactionManager transactionManager) {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public AuthServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            RefreshTokenService refreshTokenService,
            InvalidatedTokenService invalidatedTokenService,
            com.uav.platform.modules.auth.service.AuthSessionLock sessionLock) {
        this(
                userRepository,
                passwordEncoder,
                jwtTokenProvider,
                refreshTokenService,
                invalidatedTokenService,
                sessionLock,
                org.mapstruct.factory.Mappers.getMapper(AuthMapper.class),
                org.mapstruct.factory.Mappers.getMapper(UserMapper.class));
    }

    @Autowired
    public AuthServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            @Autowired(required = false) RefreshTokenService refreshTokenService,
            @Autowired(required = false) InvalidatedTokenService invalidatedTokenService,
            com.uav.platform.modules.auth.service.AuthSessionLock sessionLock,
            AuthMapper authMapper,
            UserMapper userMapper) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.refreshTokenService = refreshTokenService;
        this.invalidatedTokenService = invalidatedTokenService;
        this.sessionLock = sessionLock;
        this.authMapper = authMapper;
        this.userMapper = userMapper;
    }

    @Override
    public UserResponse register(RegisterRequest request) {
        RegistrationInput in = RegistrationOperations.normalize(request);
        if (userRepository.existsByEmailIgnoreCase(in.email()))
            throw SystemException.conflict(
                            RegistrationOperations.TAKEN_EMAIL, "REGISTER_EMAIL_TAKEN")
                    .at("email");
        if (userRepository.existsByUsernameIgnoreCase(in.username()))
            throw SystemException.conflict(
                            RegistrationOperations.TAKEN_USERNAME, "REGISTER_USERNAME_TAKEN")
                    .at("username");
        if (userRepository.existsByPhoneNumber(in.phoneNumber()))
            throw SystemException.conflict(
                            RegistrationOperations.TAKEN_PHONE, "REGISTER_PHONE_TAKEN")
                    .at("phoneNumber");

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
        // Not proven yet: the first sign-in asks for the code emailed to this address.
        newUser.setEmailVerified(false);

        AppUser savedUser = userRepository.save(newUser);
        return userMapper.toResponse(savedUser);
    }

    @Override
    @Transactional(noRollbackFor = SystemException.class)
    public AuthResponse login(LoginRequest request) {
        if (request == null) {
            throw SystemException.badRequest("Login request data cannot be null");
        }

        String usernameOrEmail =
                request.usernameOrEmail() != null ? request.usernameOrEmail().trim() : "";
        String password = request.password() != null ? request.password() : "";
        if (rateLimiter != null)
            rateLimiter.checkAccount(AuthRateLimitAction.LOGIN, usernameOrEmail);

        AppUser user =
                userRepository
                        .findByEmail(usernameOrEmail)
                        .or(
                                () ->
                                        userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc(
                                                usernameOrEmail))
                        .or(() -> userRepository.findByUsername(usernameOrEmail))
                        .orElseThrow(
                                () ->
                                        SystemException.unauthorized(
                                                CoreConstants.INVALID_CREDENTIALS));
        user = sessionLock.lock(user);

        if (UserAccountServiceImpl.isAccountLocked(user)) {
            throw SystemException.unauthorized(
                    "Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút.");
        }

        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(password, user.getPasswordHash())) {
            UserAccountServiceImpl.incrementFailedAttempts(user);
            userRepository.save(user);
            if (UserAccountServiceImpl.isAccountLocked(user)) {
                throw SystemException.unauthorized(
                        "Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút.");
            }
            throw SystemException.unauthorized(CoreConstants.INVALID_CREDENTIALS);
        }

        if (RegistrationOperations.awaitsApproval(user)) {
            throw SystemException.forbidden(
                    RegistrationOperations.PENDING_APPROVAL, "ACCOUNT_PENDING_APPROVAL");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw SystemException.badRequest(CoreConstants.ACCOUNT_INACTIVE);
        }

        if (user.getFailedAttempts() > 0) {
            UserAccountServiceImpl.resetFailedAttempts(user);
            userRepository.save(user);
        }

        if (authOtpService != null && (!user.isEmailVerified() || user.isTwoFactorEnabled())) {
            return authOtpService.createLoginChallenge(user, null);
        }

        return issueSession(user);
    }

    /**
     * Google stands in for the password only: the account checks, the 2FA challenge and the
     * throttles are login's. An unknown email gets a customer account without a usable password.
     */
    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        if (googleVerifier == null || !googleVerifier.isEnabled()) {
            throw SystemException.serviceUnavailable(
                    GoogleIdTokenService.DISABLED_MESSAGE, GoogleIdTokenService.DISABLED_CODE);
        }
        // The call to Google runs outside any transaction, so a slow Google never holds a
        // database connection.
        GoogleIdentity identity =
                googleVerifier.verify(request == null ? null : request.credential());
        if (rateLimiter != null)
            rateLimiter.checkAccount(AuthRateLimitAction.LOGIN, identity.email());
        return transactionTemplate == null
                ? signInWithGoogle(identity)
                : transactionTemplate.execute(status -> signInWithGoogle(identity));
    }

    private AuthResponse signInWithGoogle(GoogleIdentity identity) {
        String email = identity.email();
        AppUser user =
                userRepository
                        .findByEmail(email)
                        .or(() -> userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc(email))
                        .orElse(null);
        if (user == null) {
            return issueSession(createGoogleCustomer(identity));
        }
        user = sessionLock.lock(user);

        if (UserAccountServiceImpl.isAccountLocked(user)) {
            throw SystemException.unauthorized(
                    "Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút.");
        }
        if (RegistrationOperations.awaitsApproval(user)) {
            throw SystemException.forbidden(
                    RegistrationOperations.PENDING_APPROVAL, "ACCOUNT_PENDING_APPROVAL");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw SystemException.badRequest(CoreConstants.ACCOUNT_INACTIVE);
        }

        // Google has just proven the address, which is what the emailed verification code proves.
        boolean changed = false;
        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            changed = true;
        }
        if (user.getFailedAttempts() > 0) {
            UserAccountServiceImpl.resetFailedAttempts(user);
            changed = true;
        }
        if (changed) userRepository.save(user);

        // Google never bypasses the account's second factor.
        if (authOtpService != null && user.isTwoFactorEnabled()) {
            return authOtpService.createLoginChallenge(user, null);
        }
        return issueSession(user);
    }

    /**
     * Same defaults as customer self-registration (pilot/customer role, ACTIVE, no 2FA), with the
     * email already verified and no password: password login fails for a null hash, and
     * forgot-password can set one later. Never creates a staff or admin account.
     */
    private AppUser createGoogleCustomer(GoogleIdentity identity) {
        AppUser user =
                UserAccountServiceImpl.createUser(
                        uniqueUsername(RegistrationOperations.usernameFromEmail(identity.email())),
                        identity.email(),
                        null,
                        null,
                        null,
                        fullName(identity.name()),
                        null,
                        UserRole.ROLE_PILOT,
                        UserStatus.ACTIVE);
        user.setEmailVerified(true);
        user.setTwoFactorEnabled(false);
        user.setTwoFactorMethod(AuthOtpServiceImpl.METHOD_EMAIL);
        return userRepository.save(user);
    }

    /** base, then base-2 … base-20, then a few random suffixes; at most 49 characters. */
    private String uniqueUsername(String base) {
        if (!userRepository.existsByUsernameIgnoreCase(base)) return base;
        for (int i = 2; i <= 20; i++) {
            String candidate = base + "-" + i;
            if (!userRepository.existsByUsernameIgnoreCase(candidate)) return candidate;
        }
        for (int i = 0; i < 5; i++) {
            String candidate = base + "-" + UUID.randomUUID().toString().substring(0, 8);
            if (!userRepository.existsByUsernameIgnoreCase(candidate)) return candidate;
        }
        throw SystemException.conflict(
                RegistrationOperations.TAKEN_USERNAME, "REGISTER_USERNAME_TAKEN");
    }

    private static String fullName(String name) {
        if (name == null || name.isBlank()) return null;
        String trimmed = name.strip();
        return trimmed.length() > 100 ? trimmed.substring(0, 100) : trimmed;
    }

    private AuthResponse issueSession(AppUser user) {
        String token =
                jwtTokenProvider.generateToken(
                        user.getId(), user.getUsername(), user.getEmail(), user.getRole().name());
        String refreshTokenString = null;
        if (refreshTokenService != null) {
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
            refreshTokenString = refreshToken.getToken();
        }

        return authMapper.toResponse(token, refreshTokenString, userMapper.toResponse(user));
    }

    @Override
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        if (request == null || request.refreshToken() == null || request.refreshToken().isBlank()) {
            throw SystemException.badRequest("Refresh token is required");
        }
        if (refreshTokenService == null) {
            throw SystemException.internalError("RefreshTokenService is not configured");
        }

        RefreshToken refreshToken =
                refreshTokenService
                        .findByTokenForUpdate(request.refreshToken())
                        .map(refreshTokenService::verifyExpiration)
                        .orElseThrow(
                                () ->
                                        SystemException.unauthorized(
                                                "Invalid or expired refresh token"));

        AppUser user = refreshToken.getUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw SystemException.badRequest(CoreConstants.ACCOUNT_INACTIVE);
        }
        // A locked account keeps no session, even with a refresh token issued before the lock.
        if (user.isManualLocked()) {
            throw SystemException.unauthorized(
                    "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.", "ACCOUNT_LOCKED");
        }

        String newAccessToken =
                jwtTokenProvider.generateToken(
                        user.getId(), user.getUsername(), user.getEmail(), user.getRole().name());
        RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user);

        return authMapper.toResponse(
                newAccessToken, newRefreshToken.getToken(), userMapper.toResponse(user));
    }

    @Override
    public void logout(String accessToken, String refreshToken) {
        // The established endpoint accepts access and refresh independently.
        // Lock their distinct owners in ID order before either mutation, so even
        // crossed token pairs cannot introduce an A->B / B->A lock cycle.
        var owners = new java.util.TreeSet<Long>();
        if (accessToken != null && !accessToken.isBlank()) {
            try {
                Long owner = jwtTokenProvider.getUserIdFromToken(accessToken);
                if (owner == null) {
                    owner =
                            userRepository
                                    .findByUsername(
                                            jwtTokenProvider.getUsernameFromToken(accessToken))
                                    .map(AppUser::getId)
                                    .orElse(null);
                }
                if (owner != null) owners.add(owner);
            } catch (io.jsonwebtoken.JwtException | IllegalArgumentException ignored) {
                // Invalid/expired access tokens retain the existing no-op behavior.
            }
        }
        if (refreshTokenService != null)
            refreshTokenService.findUserIdByToken(refreshToken).ifPresent(owners::add);
        owners.forEach(sessionLock::lockById);
        if (accessToken != null && !accessToken.isBlank() && invalidatedTokenService != null) {
            invalidatedTokenService.invalidate(accessToken);
        }
        if (refreshToken != null && !refreshToken.isBlank() && refreshTokenService != null) {
            refreshTokenService.revokeToken(refreshToken);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String username) {
        if (username == null || username.isBlank()) {
            throw SystemException.badRequest("Username is required");
        }

        AppUser user =
                userRepository
                        .findByUsername(username)
                        .or(() -> userRepository.findByEmail(username))
                        .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));

        return userMapper.toResponse(user);
    }
}
