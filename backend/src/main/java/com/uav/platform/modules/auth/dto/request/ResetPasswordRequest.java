package com.uav.platform.modules.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        String challengeToken,
        String email,
        @NotBlank(message = "Mã OTP là bắt buộc") String code,
        @NotBlank(message = "Mật khẩu mới là bắt buộc")
                @Size(min = 8, message = "Mật khẩu mới phải có ít nhất 8 ký tự")
                String newPassword) {}
