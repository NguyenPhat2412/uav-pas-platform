package com.uav.platform.modules.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record TwoFactorVerifyRequest(
        String method,
        String challengeToken,
        @NotBlank(message = "Mã xác thực 6 chữ số là bắt buộc") String code) {}
