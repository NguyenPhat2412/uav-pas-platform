package com.uav.platform.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminOtpSupportRequest(
        @NotBlank(message = "Vui lòng nhập địa chỉ email.")
                @Size(max = 255)
                @Email(message = "Địa chỉ email không hợp lệ.")
                String email) {}
