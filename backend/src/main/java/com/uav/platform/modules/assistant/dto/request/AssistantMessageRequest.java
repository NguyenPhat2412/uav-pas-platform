package com.uav.platform.modules.assistant.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** One turn of the visible conversation; the system prompt is added server-side. */
public record AssistantMessageRequest(
        @NotBlank @Pattern(regexp = "user|assistant") String role,
        @NotBlank @Size(max = 4000) String content) {}
