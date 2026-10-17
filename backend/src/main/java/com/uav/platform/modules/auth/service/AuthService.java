package com.uav.platform.modules.auth.service;

import com.uav.platform.modules.auth.dto.request.LoginRequest;
import com.uav.platform.modules.auth.dto.request.RefreshTokenRequest;
import com.uav.platform.modules.auth.dto.request.RegisterRequest;
import com.uav.platform.modules.auth.dto.response.AuthResponse;
import com.uav.platform.modules.user.dto.response.UserResponse;

public interface AuthService {
    UserResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    void logout(String accessToken, String refreshToken);

    UserResponse getCurrentUser(String username);
}
