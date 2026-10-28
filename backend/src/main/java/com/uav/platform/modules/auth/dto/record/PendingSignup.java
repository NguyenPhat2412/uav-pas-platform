package com.uav.platform.modules.auth.dto.record;

/** Sign-up details waiting on a REGISTER_VERIFY challenge until the code proves the email. */
public record PendingSignup(String username, String phoneNumber, String passwordHash) {}
