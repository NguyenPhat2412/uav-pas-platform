package com.uav.platform.modules.user.service;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.config.response.AuthResponse;
import com.uav.platform.modules.user.config.request.LoginRequest;
import com.uav.platform.modules.user.config.request.RefreshTokenRequest;
import com.uav.platform.modules.user.config.request.RegisterRequest;
import com.uav.platform.modules.user.config.response.UserResponse;
import com.uav.platform.modules.user.config.request.ZaloLoginRequest;

public interface AuthService {
    UserResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse loginWithZalo(ZaloLoginRequest request);
    AuthResponse refreshToken(RefreshTokenRequest request);
    void logout(String accessToken, String refreshToken);
    String getZaloAuthUrl();
    UserResponse getCurrentUser(String username);
}
