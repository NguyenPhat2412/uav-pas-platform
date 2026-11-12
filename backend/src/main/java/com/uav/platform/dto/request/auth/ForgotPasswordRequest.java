package com.uav.platform.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank(message = "Email là bắt buộc") @Email(message = "Email không hợp lệ")
                String email) {}
