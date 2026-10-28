package com.uav.platform.modules.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordChangeRequest(
        @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại.") String currentPassword,
        @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
                @Size(min = 8, max = 100, message = "Mật khẩu mới từ 8 đến 100 ký tự.")
                String newPassword,
        /** Optional on the API; when sent it must equal newPassword. */
        @Size(max = 100) String confirmPassword) {

    public PasswordChangeRequest(String currentPassword, String newPassword) {
        this(currentPassword, newPassword, null);
    }
}
