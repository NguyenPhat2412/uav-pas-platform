package com.uav.platform.dto.request.auth;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Vui lòng nhập tên đăng nhập hoặc email.") String usernameOrEmail,
        @NotBlank(message = "Vui lòng nhập mật khẩu.") String password) {}
