package com.uav.platform.modules.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record TwoFactorVerifyRequest(
        String method,
        String challengeToken,
        @NotBlank(message = "Vui lòng nhập mã xác thực.")
                @Pattern(regexp = "\\d{6}", message = "Vui lòng nhập đủ 6 chữ số xác thực.")
                String code) {}
