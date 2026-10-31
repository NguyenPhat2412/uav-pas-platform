package com.uav.platform.dto.request.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyOtpRequest(
        String challengeToken,
        String email,
        @NotBlank(message = "Vui lòng nhập mã OTP.")
                @Pattern(regexp = "\\d{6}", message = "Vui lòng nhập đủ 6 chữ số OTP.")
                String code,
        String method) {}
