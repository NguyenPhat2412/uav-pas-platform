package com.uav.platform.dto.request.user;

import com.uav.platform.enums.user.UserRole;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Account created by an administrator; the role is chosen up front instead of defaulting to pilot. */
public record AdminCreateUserRequest(
        @NotBlank @Size(min = 3, max = 50) String username,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotBlank String phoneNumber,
        @Size(max = 120) String fullName,
        @NotNull UserRole role,
        /** Optional on the API; when sent it must equal password. */
        @Size(max = 100) String confirmPassword) {

    public AdminCreateUserRequest(
            String username,
            String email,
            String password,
            String phoneNumber,
            String fullName,
            UserRole role) {
        this(username, email, password, phoneNumber, fullName, role, null);
    }
}
