package com.uav.platform.service.auth;

import com.uav.platform.dto.request.auth.GoogleLoginRequest;
import com.uav.platform.dto.request.auth.LoginRequest;
import com.uav.platform.dto.request.auth.RefreshTokenRequest;
import com.uav.platform.dto.request.auth.RegisterRequest;
import com.uav.platform.dto.response.auth.AuthResponse;
import com.uav.platform.dto.response.user.UserResponse;

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
