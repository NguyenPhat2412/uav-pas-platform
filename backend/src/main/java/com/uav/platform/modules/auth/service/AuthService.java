package com.uav.platform.modules.auth.service;

import com.uav.platform.modules.auth.dto.request.GoogleLoginRequest;
import com.uav.platform.modules.auth.dto.request.LoginRequest;
import com.uav.platform.modules.auth.dto.request.RefreshTokenRequest;
import com.uav.platform.modules.auth.dto.request.RegisterRequest;
import com.uav.platform.modules.auth.dto.response.AuthResponse;
import com.uav.platform.modules.user.dto.response.UserResponse;

public interface AuthService {
    UserResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    /**
     * Signs in with a Google ID token. Same responses as {@link #login}: a session, or a 2FA
     * challenge when the account has two-factor enabled. An unknown email gets a new customer
     * account.
     */
    AuthResponse loginWithGoogle(GoogleLoginRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    void logout(String accessToken, String refreshToken);

    UserResponse getCurrentUser(String username);
}
