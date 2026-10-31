package com.uav.platform.dto.request.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        String challengeToken,
        String email,
        @NotBlank(message = "Vui lòng nhập mã OTP.")
                @Pattern(regexp = "\\d{6}", message = "Vui lòng nhập đủ 6 chữ số OTP.")
                String code,
        @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
                @Size(max = 128, message = "Mật khẩu tối đa 72 byte.")
                String newPassword,
        /** Optional on the API; when sent it must equal newPassword. */
        @Size(max = 128) String confirmPassword) {

    public ResetPasswordRequest(
            String challengeToken, String email, String code, String newPassword) {
        this(challengeToken, email, code, newPassword, null);
    }
}
