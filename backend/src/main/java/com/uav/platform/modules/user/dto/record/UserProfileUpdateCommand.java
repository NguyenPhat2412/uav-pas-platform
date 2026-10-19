package com.uav.platform.modules.user.dto.record;

/** Explicit allowlist prevents identity and administrative fields from entering a self update. */
public record UserProfileUpdateCommand(
        String fullName, String phoneNumber, String expectedRevision) {}
