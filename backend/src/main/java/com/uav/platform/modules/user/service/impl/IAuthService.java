package com.uav.platform.modules.user.service.impl;

import com.uav.platform.modules.user.mapper.AuthMapper;
import com.uav.platform.modules.user.mapper.UserMapper;

import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.config.request.*;
import com.uav.platform.modules.user.config.response.*;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.entity.RefreshToken;
import com.uav.platform.modules.user.common.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.AuthService;
import com.uav.platform.modules.user.service.InvalidatedTokenService;
import com.uav.platform.modules.user.service.RefreshTokenService;
import com.uav.platform.modules.user.service.ZaloOAuthService;
import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.error.SystemException;
import com.uav.platform.security.jwt.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class IAuthService implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final ZaloOAuthService zaloOAuthService;
    private final RefreshTokenService refreshTokenService;
    private final InvalidatedTokenService invalidatedTokenService;

    public IAuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            ZaloOAuthService zaloOAuthService
    ) {
        this(userRepository, passwordEncoder, jwtTokenProvider, zaloOAuthService, null, null);
    }

    @Autowired
    public IAuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            ZaloOAuthService zaloOAuthService,
            @Autowired(required = false) RefreshTokenService refreshTokenService,
            @Autowired(required = false) InvalidatedTokenService invalidatedTokenService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.zaloOAuthService = zaloOAuthService;
        this.refreshTokenService = refreshTokenService;
        this.invalidatedTokenService = invalidatedTokenService;
    }

    @Override
    public UserResponse register(RegisterRequest request) {
        if (request == null) {
            throw SystemException.badRequest(CoreConstants.REGISTRATION_DATA_REQUIRED);
        }

        String email = request.email() != null ? request.email().trim() : "";
        String username = request.username() != null ? request.username().trim() : "";
        String phoneNumber = request.phoneNumber() != null ? request.phoneNumber().trim() : "";

        if (userRepository.existsByEmail(email)) {
            throw SystemException.conflict(CoreConstants.EMAIL_ALREADY_EXISTS);
        }

        if (userRepository.existsByUsername(username)) {
            throw SystemException.conflict(CoreConstants.USERNAME_ALREADY_EXISTS);
        }

        if (userRepository.existsByPhoneNumber(phoneNumber)) {
            throw SystemException.conflict(CoreConstants.PHONE_ALREADY_EXISTS);
        }

        String hashedPassword = passwordEncoder.encode(request.password());

        AppUser newUser = new AppUser(
                username,
                email,
                hashedPassword,
                phoneNumber,
                UserStatus.ACTIVE
        );

        AppUser savedUser = userRepository.save(newUser);
        return UserMapper.toResponse(savedUser);
    }

    @Override
    @Transactional(noRollbackFor = SystemException.class)
    public AuthResponse login(LoginRequest request) {
        if (request == null) {
            throw SystemException.badRequest("Login request data cannot be null");
        }

        String usernameOrEmail = request.usernameOrEmail() != null ? request.usernameOrEmail().trim() : "";
        String password = request.password() != null ? request.password() : "";

        AppUser user = userRepository.findByEmail(usernameOrEmail)
                .or(() -> userRepository.findByUsername(usernameOrEmail))
                .orElseThrow(() -> SystemException.unauthorized(CoreConstants.INVALID_CREDENTIALS));

        if (user.isAccountLocked()) {
            throw SystemException.unauthorized("Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút.");
        }

        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            user.incrementFailedAttempts();
            userRepository.save(user);
            if (user.isAccountLocked()) {
                throw SystemException.unauthorized("Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút.");
            }
            throw SystemException.unauthorized(CoreConstants.INVALID_CREDENTIALS);
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw SystemException.badRequest(CoreConstants.ACCOUNT_INACTIVE);
        }

        if (user.getFailedAttempts() > 0) {
            user.resetFailedAttempts();
            userRepository.save(user);
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail());
        String refreshTokenString = null;
        if (refreshTokenService != null) {
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
            refreshTokenString = refreshToken.getToken();
        }

        return AuthMapper.toResponse(token, refreshTokenString, UserMapper.toResponse(user));
    }

    @Override
    public AuthResponse loginWithZalo(ZaloLoginRequest request) {
        if (request == null || request.code() == null || request.code().isBlank()) {
            throw SystemException.badRequest("Zalo auth code is required");
        }

        ZaloUserProfile profile = zaloOAuthService.authenticateWithZalo(request.code());
        if (profile == null || profile.id() == null || profile.id().isBlank()) {
            throw SystemException.badRequest(CoreConstants.ZALO_AUTH_FAILED);
        }

        AppUser user = userRepository.findByZaloId(profile.id())
                .orElseGet(() -> createZaloUser(profile));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw SystemException.badRequest(CoreConstants.ACCOUNT_INACTIVE);
        }

        if (user.getFailedAttempts() > 0) {
            user.resetFailedAttempts();
            userRepository.save(user);
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail());
        String refreshTokenString = null;
        if (refreshTokenService != null) {
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
            refreshTokenString = refreshToken.getToken();
        }

        return AuthMapper.toResponse(token, refreshTokenString, UserMapper.toResponse(user));
    }

    @Override
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        if (request == null || request.refreshToken() == null || request.refreshToken().isBlank()) {
            throw SystemException.badRequest("Refresh token is required");
        }
        if (refreshTokenService == null) {
            throw SystemException.internalError("RefreshTokenService is not configured");
        }

        RefreshToken refreshToken = refreshTokenService.findByToken(request.refreshToken())
                .map(refreshTokenService::verifyExpiration)
                .orElseThrow(() -> SystemException.unauthorized("Invalid or expired refresh token"));

        AppUser user = refreshToken.getUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw SystemException.badRequest(CoreConstants.ACCOUNT_INACTIVE);
        }

        String newAccessToken = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail());
        RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user);

        return AuthMapper.toResponse(newAccessToken, newRefreshToken.getToken(), UserMapper.toResponse(user));
    }

    @Override
    public void logout(String accessToken, String refreshToken) {
        if (accessToken != null && !accessToken.isBlank() && invalidatedTokenService != null) {
            invalidatedTokenService.invalidate(accessToken);
        }
        if (refreshToken != null && !refreshToken.isBlank() && refreshTokenService != null) {
            refreshTokenService.revokeToken(refreshToken);
        }
    }

    @Override
    public String getZaloAuthUrl() {
        return zaloOAuthService.getAuthorizationUrl();
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String username) {
        if (username == null || username.isBlank()) {
            throw SystemException.badRequest("Username is required");
        }

        AppUser user = userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));

        return UserMapper.toResponse(user);
    }

    private AppUser createZaloUser(ZaloUserProfile profile) {
        String baseId = profile.id().startsWith("zalo_") ? profile.id() : "zalo_" + profile.id();
        String baseUsername = baseId;
        String username = baseUsername;
        int suffix = 1;
        while (userRepository.existsByUsername(username)) {
            username = baseUsername + "_" + suffix++;
        }

        String baseEmail = baseId + "@zalo.local";
        String email = baseEmail;
        suffix = 1;
        while (userRepository.existsByEmail(email)) {
            email = baseId + "_" + suffix++ + "@zalo.local";
        }

        String fullName = profile.name() != null && !profile.name().isBlank() ? profile.name() : "Zalo User";
        String avatarUrl = profile.avatar();

        AppUser newUser = new AppUser(
                username,
                email,
                null,
                null,
                profile.id(),
                fullName,
                avatarUrl,
                UserStatus.ACTIVE
        );

        return userRepository.save(newUser);
    }
}
