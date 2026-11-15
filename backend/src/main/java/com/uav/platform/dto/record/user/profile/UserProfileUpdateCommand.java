package com.uav.platform.dto.record.user.profile;

/** Explicit allowlist prevents identity and administrative fields from entering a self update. */
public record UserProfileUpdateCommand(
        String fullName, String phoneNumber, String expectedRevision) {}
