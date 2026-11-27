package com.uav.platform.service;

import com.uav.platform.dto.request.AppleLoginRequest;
import com.uav.platform.dto.request.GoogleLoginRequest;
import com.uav.platform.dto.request.LoginRequest;
import com.uav.platform.dto.request.RefreshTokenRequest;
import com.uav.platform.dto.request.RegisterRequest;
import com.uav.platform.dto.response.AuthResponse;
import com.uav.platform.dto.response.UserResponse;

public interface AuthService {
    UserResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    /**
     * Signs in with a Google ID token. Same responses as {@link #login}: a session, or a 2FA
     * challenge when the account has two-factor enabled. An unknown email gets a new customer
     * account.
     */
    AuthResponse loginWithGoogle(GoogleLoginRequest request);

    /**
     * Signs in with an Apple ID token. Same responses as {@link #login}: a session, or a 2FA
     * challenge when the account has two-factor enabled. An unknown Apple ID with a verified email
     * gets a new customer account bound to {@code apple_sub}.
     */
    AuthResponse loginWithApple(AppleLoginRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    void logout(String accessToken, String refreshToken);

    UserResponse getCurrentUser(String username);
}
