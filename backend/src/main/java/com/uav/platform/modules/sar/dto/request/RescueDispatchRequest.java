package com.uav.platform.modules.sar.dto.request;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Map;

/** Preserves the existing JSON object while giving the API an explicit request type. */
public record RescueDispatchRequest(Map<String, Object> payload) {
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public RescueDispatchRequest {}
}
