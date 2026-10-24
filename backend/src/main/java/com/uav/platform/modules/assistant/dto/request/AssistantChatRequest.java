package com.uav.platform.modules.assistant.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/**
 * mode 1 or 2 picks the configured model; history is capped so a request stays bounded. conversationId continues
 * a stored thread of the caller (null starts one); portal is where the widget runs and is checked against the role.
 */
public record AssistantChatRequest(
        @Min(1) @Max(2) int mode,
        @NotEmpty @Size(max = 20) List<@Valid AssistantMessageRequest> messages,
        Long conversationId,
        @Pattern(regexp = "CUSTOMER|OPERATIONS|ADMIN") String portal) {

    public AssistantChatRequest(int mode, List<AssistantMessageRequest> messages) {
        this(mode, messages, null, null);
    }
}
