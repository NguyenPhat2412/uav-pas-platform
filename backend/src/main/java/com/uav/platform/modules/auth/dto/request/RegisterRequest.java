package com.uav.platform.modules.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Raw sign-up form; RegistrationOperations trims, normalises and applies the full rules. */
public record RegisterRequest(
        @NotBlank(message = "Vui lòng nhập tên đăng nhập.")
                @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự.")
                String username,
        @NotBlank(message = "Vui lòng nhập email.")
                @Email(message = "Địa chỉ email không hợp lệ.")
                @Size(max = 255, message = "Email tối đa 255 ký tự.")
                String email,
        @NotBlank(message = "Vui lòng nhập mật khẩu.")
                @Size(min = 8, max = 128, message = "Mật khẩu phải từ 8 ký tự trở lên.")
                String password,
        @NotBlank(message = "Vui lòng nhập số điện thoại.")
                @Size(max = 30, message = "Số điện thoại không hợp lệ.")
                String phoneNumber,
        @Size(max = 20) String role,
        /** Optional on the API; when sent it must equal password (the sign-up form always sends it). */
        @Size(max = 128) String confirmPassword) {

    public RegisterRequest(
            String username, String email, String password, String phoneNumber, String role) {
        this(username, email, password, phoneNumber, role, null);
    }

    public RegisterRequest(String username, String email, String password, String phoneNumber) {
        this(username, email, password, phoneNumber, null, null);
    }
}
