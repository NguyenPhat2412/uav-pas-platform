package com.uav.platform.modules.user.dto.response;

/** Separate from the authentication response; revision only guards profile edits. */
public record UserProfileResponse(Long id, String fullName, String phoneNumber, String revision) {}
