package com.uav.platform.dto.record.auth;

import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;

/** Sign-up data after normalisation: trimmed username, lower-case email, digits-only phone, and the allowed role. */
public record RegistrationInput(
        String username, String email, String phoneNumber, UserRole role, UserStatus status) {}
