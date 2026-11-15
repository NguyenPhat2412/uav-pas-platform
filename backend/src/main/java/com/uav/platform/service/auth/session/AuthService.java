package com.uav.platform.service.auth.session;

import com.uav.platform.dto.request.auth.oauth.AppleLoginRequest;
import com.uav.platform.dto.request.auth.oauth.GoogleLoginRequest;
import com.uav.platform.dto.request.auth.session.LoginRequest;
import com.uav.platform.dto.request.auth.session.RefreshTokenRequest;
import com.uav.platform.dto.request.auth.session.RegisterRequest;
import com.uav.platform.dto.response.auth.session.AuthResponse;
import com.uav.platform.dto.response.user.account.UserResponse;

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
