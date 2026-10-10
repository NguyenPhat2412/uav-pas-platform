package com.uav.platform.modules.user.controller;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.config.request.*;
import com.uav.platform.modules.user.config.response.*;
import com.uav.platform.modules.user.service.AuthService;
import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.constant.RestEndpoint;
import com.uav.platform.error.SystemException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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

    public AuthController(AuthService authService) {
        this.authService = authService;
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
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Refresh access token using refresh token")
    @PostMapping(RestEndpoint.REFRESH)
    public ResponseEntity<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Logout user and invalidate tokens")
    @PostMapping(RestEndpoint.LOGOUT)
    public ResponseEntity<Map<String, String>> logout(
            HttpServletRequest request,
            @RequestBody(required = false) LogoutRequest logoutRequest
    ) {
        String authHeader = request.getHeader("Authorization");
        String accessToken = null;
        if (authHeader != null && authHeader.trim().regionMatches(true, 0, "Bearer ", 0, 7)) {
            accessToken = authHeader.trim().substring(7).trim();
        }

        String refreshToken = logoutRequest != null ? logoutRequest.refreshToken() : null;
        authService.logout(accessToken, refreshToken);

        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @Operation(summary = CoreConstants.AUTH_OP_ME_SUMMARY)
    @GetMapping(RestEndpoint.ME)
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw SystemException.unauthorized("Authentication required");
        }
        UserResponse response = authService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(response);
    }
}
