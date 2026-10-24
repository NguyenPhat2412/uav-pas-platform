package com.uav.platform.modules.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerifyOtpRequest(
        String challengeToken,
        String email,
        @NotBlank(message = "Mã xác thực OTP là bắt buộc")
                @Size(min = 6, max = 8, message = "Mã OTP phải gồm 6 chữ số")
                String code,
        String method) {}
