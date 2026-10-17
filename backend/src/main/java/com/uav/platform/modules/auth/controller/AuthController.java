package com.uav.platform.modules.auth.controller;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.constant.RestEndpoint;
import com.uav.platform.error.SystemException;
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

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping(RestEndpoint.AUTH)
@Tag(name = CoreConstants.AUTH_TAG_NAME, description = CoreConstants.AUTH_TAG_DESCRIPTION)
public class AuthController {

    private final AuthService authService;
    private final AuthCookieHelper authCookieHelper;

    public AuthController(AuthService authService) {
        this(authService, null);
    }

    @Autowired
    public AuthController(
            AuthService authService,
            @Autowired(required = false) AuthCookieHelper authCookieHelper) {
        this.authService = authService;
        this.authCookieHelper = authCookieHelper;
    }

    @Operation(summary = CoreConstants.AUTH_OP_REGISTER_SUMMARY)
    @PostMapping(RestEndpoint.REGISTER)
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = CoreConstants.AUTH_OP_LOGIN_SUMMARY)
    @PostMapping(RestEndpoint.LOGIN)
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (authCookieHelper != null) {
            if (response.accessToken() != null) {
                builder.header(
                        HttpHeaders.SET_COOKIE,
                        authCookieHelper
                                .createAccessTokenCookie(response.accessToken(), 86400)
                                .toString());
            }
            if (response.refreshToken() != null) {
                builder.header(
                        HttpHeaders.SET_COOKIE,
                        authCookieHelper
                                .createRefreshTokenCookie(response.refreshToken(), 604800)
                                .toString());
            }
        }
        return builder.body(response);
    }

    @Operation(summary = "Refresh access token using refresh token")
    @PostMapping(RestEndpoint.REFRESH)
    public ResponseEntity<AuthResponse> refreshToken(
            HttpServletRequest httpRequest,
            @RequestBody(required = false) RefreshTokenRequest request) {
        String tokenString = request != null ? request.refreshToken() : null;
        if ((tokenString == null || tokenString.isBlank()) && authCookieHelper != null) {
            tokenString = authCookieHelper.resolveRefreshToken(httpRequest);
        }
        if (tokenString == null || tokenString.isBlank()) {
            throw SystemException.badRequest("Refresh token is required");
        }
        AuthResponse response = authService.refreshToken(new RefreshTokenRequest(tokenString));
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (authCookieHelper != null) {
            if (response.accessToken() != null) {
                builder.header(
                        HttpHeaders.SET_COOKIE,
                        authCookieHelper
                                .createAccessTokenCookie(response.accessToken(), 86400)
                                .toString());
            }
            if (response.refreshToken() != null) {
                builder.header(
                        HttpHeaders.SET_COOKIE,
                        authCookieHelper
                                .createRefreshTokenCookie(response.refreshToken(), 604800)
                                .toString());
            }
        }
        return builder.body(response);
    }

    @Operation(summary = "Logout user and invalidate tokens")
    @PostMapping(RestEndpoint.LOGOUT)
    public ResponseEntity<Map<String, String>> logout(
            HttpServletRequest request,
            @RequestBody(required = false) LogoutRequest logoutRequest) {
        String authHeader = request.getHeader("Authorization");
        String accessToken = null;
        if (authHeader != null && authHeader.trim().regionMatches(true, 0, "Bearer ", 0, 7)) {
            accessToken = authHeader.trim().substring(7).trim();
        } else if (authCookieHelper != null) {
            accessToken = authCookieHelper.resolveAccessToken(request);
        }

        String refreshToken = logoutRequest != null ? logoutRequest.refreshToken() : null;
        if ((refreshToken == null || refreshToken.isBlank()) && authCookieHelper != null) {
            refreshToken = authCookieHelper.resolveRefreshToken(request);
        }

        authService.logout(accessToken, refreshToken);

        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (authCookieHelper != null) {
            builder.header(
                    HttpHeaders.SET_COOKIE, authCookieHelper.clearAccessTokenCookie().toString());
            builder.header(
                    HttpHeaders.SET_COOKIE, authCookieHelper.clearRefreshTokenCookie().toString());
        }

        return builder.body(Map.of("message", "Logged out successfully"));
    }

    @Operation(summary = CoreConstants.AUTH_OP_ME_SUMMARY)
    @GetMapping(RestEndpoint.ME)
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw SystemException.unauthorized("Authentication required");
        }
        UserResponse response = authService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(response);
    }
}
