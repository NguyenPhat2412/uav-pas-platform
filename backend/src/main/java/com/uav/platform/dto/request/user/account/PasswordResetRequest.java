package com.uav.platform.dto.request.user.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetRequest(@NotBlank @Size(min = 8, max = 100) String newPassword) {}
