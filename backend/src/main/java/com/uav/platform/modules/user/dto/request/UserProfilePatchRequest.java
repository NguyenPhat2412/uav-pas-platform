package com.uav.platform.modules.user.dto.request;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Map;

/** Preserves the existing JSON object while giving the API an explicit request type. */
public record UserProfilePatchRequest(Map<String, Object> fields) {
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public UserProfilePatchRequest {}
}
