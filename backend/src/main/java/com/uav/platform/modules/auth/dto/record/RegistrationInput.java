package com.uav.platform.modules.auth.dto.record;

import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;

/** Sign-up data after normalisation: trimmed username, lower-case email, digits-only phone, and the allowed role. */
public record RegistrationInput(
        String username, String email, String phoneNumber, UserRole role, UserStatus status) {}
