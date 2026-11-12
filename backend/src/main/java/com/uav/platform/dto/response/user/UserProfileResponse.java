package com.uav.platform.dto.response.user;

/** Separate from the authentication response; revision only guards profile edits. */
public record UserProfileResponse(Long id, String fullName, String phoneNumber, String revision) {}
