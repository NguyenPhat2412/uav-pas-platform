package com.uav.platform.dto.record.auth;

/** Sign-up details waiting on a REGISTER_VERIFY challenge until the code proves the email. */
public record PendingSignup(String username, String phoneNumber, String passwordHash) {}
