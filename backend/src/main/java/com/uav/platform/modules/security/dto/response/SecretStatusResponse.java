package com.uav.platform.modules.security.dto.response;

/**
 * Health of one secret, never its value or any part of it. {@code status} is OK, MISSING,
 * NOT_REQUIRED, TOO_SHORT or KNOWN_DEFAULT.
 */
public record SecretStatusResponse(
        String property,
        String envVar,
        boolean required,
        boolean configured,
        int minimumLength,
        boolean meetsMinimumLength,
        boolean usesKnownDefault,
        String status,
        String note,
        String managedIn,
        String rotationKey) {}
