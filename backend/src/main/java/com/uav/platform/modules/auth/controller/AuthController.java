package com.uav.platform.modules.auth.controller;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.constant.RestEndpoint;
import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.modules.auth.dto.request.LoginRequest;
import com.uav.platform.modules.auth.dto.request.LogoutRequest;
import com.uav.platform.modules.auth.dto.request.RefreshTokenRequest;
import com.uav.platform.modules.auth.dto.request.RegisterRequest;
import com.uav.platform.modules.auth.dto.response.AuthResponse;
import com.uav.platform.modules.auth.service.AuthService;
import com.uav.platform.modules.user.dto.response.UserResponse;
import com.uav.platform.security.AuthCookieHelper;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(RestEndpoint.AUTH)
@RequiredArgsConstructor(onConstructor_ = @Autowired)
@Tag(name = CoreConstants.AUTH_TAG_NAME, description = CoreConstants.AUTH_TAG_DESCRIPTION)
public class AuthController {

    private final AuthService authService;
    private final AuthCookieHelper authCookieHelper;

    public AuthController(AuthService authService) {
        this(authService, null);
    }

    @Operation(summary = CoreConstants.AUTH_OP_REGISTER_SUMMARY)
    @PostMapping(RestEndpoint.REGISTER)
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @Operation(summary = CoreConstants.AUTH_OP_LOGIN_SUMMARY)
    @PostMapping(RestEndpoint.LOGIN)
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return AuthCookieHelper.okWithCookies(authCookieHelper, authService.login(request));
    }

    @Operation(summary = "Refresh access token using refresh token")
    @PostMapping(RestEndpoint.REFRESH)
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
    @PostMapping(RestEndpoint.LOGOUT)
    public ResponseEntity<MessageResponse> logout(
            HttpServletRequest request,
            @RequestBody(required = false) LogoutRequest logoutRequest) {
        authService.logout(
                AuthCookieHelper.extractAccessToken(authCookieHelper, request),
                AuthCookieHelper.extractRefreshToken(authCookieHelper, request, logoutRequest));
        return AuthCookieHelper.okClearedCookies(authCookieHelper, "Logged out successfully");
    }

    @Operation(summary = CoreConstants.AUTH_OP_ME_SUMMARY)
    @GetMapping(RestEndpoint.ME)
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        return ResponseEntity.ok(
                authService.getCurrentUser(
                        AuthCookieHelper.requireAuthenticatedUsername(authentication)));
    }
}
