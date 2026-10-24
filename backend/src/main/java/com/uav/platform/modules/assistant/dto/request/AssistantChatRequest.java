package com.uav.platform.modules.assistant.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/** mode 1 or 2 picks the configured model; history is capped so a request stays bounded. */
public record AssistantChatRequest(
        @Min(1) @Max(2) int mode,
        @NotEmpty @Size(max = 20) List<@Valid AssistantMessageRequest> messages) {}
