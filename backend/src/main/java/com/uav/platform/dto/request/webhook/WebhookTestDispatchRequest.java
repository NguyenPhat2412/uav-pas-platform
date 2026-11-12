package com.uav.platform.dto.request.webhook;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Map;

/** Preserves the existing JSON object while giving the API an explicit request type. */
public record WebhookTestDispatchRequest(Map<String, Object> payload) {
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public WebhookTestDispatchRequest {}
}
