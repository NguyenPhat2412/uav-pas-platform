package com.uav.platform.controller.auth;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.auth.*;
import com.uav.platform.dto.response.auth.*;
import com.uav.platform.dto.response.user.UserResponse;
import com.uav.platform.enums.auth.AuthRateLimitAction;
import com.uav.platform.security.AuthCookieHelper;
import com.uav.platform.security.ClientIpResolver;
import com.uav.platform.service.auth.AuthOtpService;
import com.uav.platform.service.auth.AuthRateLimitService;
import com.uav.platform.service.auth.AuthService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiRoutes.Auth.BASE)
@Tag(name = CoreConstants.AUTH_TAG_NAME, description = CoreConstants.AUTH_TAG_DESCRIPTION)
public class AuthController {

    private final AuthService authService;
    private final AuthCookieHelper authCookieHelper;
    private final AuthOtpService authOtpService;
    private AuthRateLimitService rateLimiter;

    public AuthController(AuthService authService) {
        this(authService, null, null);
    }

    public AuthController(AuthService authService, AuthCookieHelper authCookieHelper) {
        this(authService, authCookieHelper, null);
    }

    @Autowired
    public AuthController(
            AuthService authService,
            @Autowired(required = false) AuthCookieHelper authCookieHelper,
            @Autowired(required = false) AuthOtpService authOtpService) {
        this.authService = authService;
        this.authCookieHelper = authCookieHelper;
        this.authOtpService = authOtpService;
    }

    @Autowired(required = false)
    public void setRateLimiter(AuthRateLimitService rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    /** Per-client-IP throttle; the services add the per-account one. */
    private void limitClient(AuthRateLimitAction action, HttpServletRequest httpRequest) {
        if (rateLimiter != null)
            rateLimiter.checkClient(action, ClientIpResolver.resolve(httpRequest));
    }

    @Operation(summary = CoreConstants.AUTH_OP_REGISTER_SUMMARY)
    @PostMapping(ApiRoutes.Auth.REGISTER)
    public ResponseEntity<UserResponse> register(
            HttpServletRequest httpRequest, @Valid @RequestBody RegisterRequest request) {
        limitClient(AuthRateLimitAction.OTP_ISSUE, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @Operation(summary = "Register account and send 6-digit Email OTP verification code")
    @PostMapping(ApiRoutes.Auth.REGISTER_OTP)
    public ResponseEntity<OtpChallengeResponse> registerWithOtp(
            HttpServletRequest httpRequest, @Valid @RequestBody RegisterRequest request) {
        limitClient(AuthRateLimitAction.OTP_ISSUE, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authOtpService.requestRegisterOtp(request));
    }

    @Operation(summary = "Verify 6-digit Email OTP and issue JWT session")
    @PostMapping(ApiRoutes.Auth.VERIFY_EMAIL)
    public ResponseEntity<AuthResponse> verifyEmail(
            HttpServletRequest httpRequest, @Valid @RequestBody VerifyOtpRequest request) {
        limitClient(AuthRateLimitAction.OTP_VERIFY, httpRequest);
        return AuthCookieHelper.okWithCookies(
                authCookieHelper, authOtpService.verifyEmailOtp(request));
    }

    @Operation(summary = CoreConstants.AUTH_OP_LOGIN_SUMMARY)
    @PostMapping(ApiRoutes.Auth.LOGIN)
    public ResponseEntity<AuthResponse> login(
            HttpServletRequest httpRequest, @Valid @RequestBody LoginRequest request) {
        limitClient(AuthRateLimitAction.LOGIN, httpRequest);
        return AuthCookieHelper.okWithCookies(authCookieHelper, authService.login(request));
    }

    @Operation(summary = CoreConstants.AUTH_OP_GOOGLE_SUMMARY)
    @PostMapping(ApiRoutes.Auth.GOOGLE)
    public ResponseEntity<AuthResponse> loginWithGoogle(
            HttpServletRequest httpRequest,
            @RequestBody(required = false) GoogleLoginRequest request) {
        limitClient(AuthRateLimitAction.LOGIN, httpRequest);
        return AuthCookieHelper.okWithCookies(
                authCookieHelper, authService.loginWithGoogle(request));
    }

    @Operation(summary = "Verify 2FA code (Email OTP or TOTP Authenticator) and issue JWT session")
    @PostMapping(ApiRoutes.Auth.VERIFY_2FA)
    public ResponseEntity<AuthResponse> verify2fa(
            HttpServletRequest httpRequest, @Valid @RequestBody VerifyOtpRequest request) {
        limitClient(AuthRateLimitAction.OTP_VERIFY, httpRequest);
        return AuthCookieHelper.okWithCookies(
                authCookieHelper, authOtpService.verifyLogin2fa(request));
    }

    @Operation(summary = "Resend 6-digit Email OTP for active challenge")
    @PostMapping(ApiRoutes.Auth.RESEND_OTP)
    public ResponseEntity<OtpChallengeResponse> resendOtp(
            HttpServletRequest httpRequest, @RequestBody ResendOtpRequest request) {
        limitClient(AuthRateLimitAction.OTP_ISSUE, httpRequest);
        return ResponseEntity.ok(authOtpService.resendOtp(request));
    }

    @Operation(summary = "Request 6-digit Email OTP for password reset")
    @PostMapping(ApiRoutes.Auth.FORGOT_PASSWORD)
    public ResponseEntity<OtpChallengeResponse> forgotPassword(
            HttpServletRequest httpRequest, @Valid @RequestBody ForgotPasswordRequest request) {
        limitClient(AuthRateLimitAction.OTP_ISSUE, httpRequest);
        return ResponseEntity.ok(authOtpService.forgotPassword(request));
    }

    @Operation(summary = "Reset password using 6-digit Email OTP")
    @PostMapping(ApiRoutes.Auth.RESET_PASSWORD)
    public ResponseEntity<MessageResponse> resetPassword(
            HttpServletRequest httpRequest, @Valid @RequestBody ResetPasswordRequest request) {
        limitClient(AuthRateLimitAction.OTP_VERIFY, httpRequest);
        return ResponseEntity.ok(authOtpService.resetPassword(request));
    }

    @Operation(summary = "Get current user 2FA configuration status")
    @GetMapping(ApiRoutes.Auth.TWO_FACTOR_STATUS)
    public ResponseEntity<TwoFactorStatusResponse> get2faStatus(Authentication authentication) {
        return ResponseEntity.ok(
                authOtpService.get2faStatus(
                        AuthCookieHelper.requireAuthenticatedUsername(authentication)));
    }

    @Operation(summary = "Initialize 2FA setup (EMAIL OTP or TOTP QR secret)")
    @PostMapping(ApiRoutes.Auth.TWO_FACTOR_SETUP)
    public ResponseEntity<TwoFactorSetupResponse> setup2fa(
            Authentication authentication,
            @RequestBody(required = false) TwoFactorSetupRequest request) {
        return ResponseEntity.ok(
                authOtpService.setup2fa(
                        AuthCookieHelper.requireAuthenticatedUsername(authentication), request));
    }

    @Operation(summary = "Verify code and enable 2FA on current account")
    @PostMapping(ApiRoutes.Auth.TWO_FACTOR_ENABLE)
    public ResponseEntity<TwoFactorStatusResponse> enable2fa(
            Authentication authentication, @Valid @RequestBody TwoFactorVerifyRequest request) {
        return ResponseEntity.ok(
                authOtpService.enable2fa(
                        AuthCookieHelper.requireAuthenticatedUsername(authentication), request));
    }

    @Operation(summary = "Disable 2FA on current account")
    @PostMapping(ApiRoutes.Auth.TWO_FACTOR_DISABLE)
    public ResponseEntity<TwoFactorStatusResponse> disable2fa(
            Authentication authentication,
            @RequestBody(required = false) TwoFactorDisableRequest request) {
        return ResponseEntity.ok(
                authOtpService.disable2fa(
                        AuthCookieHelper.requireAuthenticatedUsername(authentication), request));
    }

    @Operation(summary = "Refresh access token using refresh token")
    @PostMapping(ApiRoutes.Auth.REFRESH)
    public ResponseEntity<AuthResponse> refreshToken(
            HttpServletRequest httpRequest,
            @RequestBody(required = false) RefreshTokenRequest request) {
        return AuthCookieHelper.okWithCookies(
                authCookieHelper,
                authService.refreshToken(
                        AuthCookieHelper.requireRefreshRequest(
                                authCookieHelper, httpRequest, request)));
    }

    @Operation(summary = "Logout user and invalidate tokens")
    @PostMapping(ApiRoutes.Auth.LOGOUT)
    public ResponseEntity<MessageResponse> logout(
            HttpServletRequest request,
            @RequestBody(required = false) LogoutRequest logoutRequest) {
        authService.logout(
                AuthCookieHelper.extractAccessToken(authCookieHelper, request),
                AuthCookieHelper.extractRefreshToken(authCookieHelper, request, logoutRequest));
        return AuthCookieHelper.okClearedCookies(authCookieHelper, "Logged out successfully");
    }

    @Operation(summary = CoreConstants.AUTH_OP_ME_SUMMARY)
    @GetMapping(ApiRoutes.Auth.ME)
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        return ResponseEntity.ok(
                authService.getCurrentUser(
                        AuthCookieHelper.requireAuthenticatedUsername(authentication)));
    }
}
