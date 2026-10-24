package com.uav.platform.modules.assistant.dto.request;

import jakarta.validation.constraints.*;

/**
 * apiKey: null keeps the stored key, an empty string disconnects, anything else replaces it.
 * Models are 9router model ids or combo names (e.g. "cc/claude-sonnet-4-5"); a mode without a model is hidden.
 */
public record AiRouterSettingsRequest(
        @NotBlank @Size(max = 255) @Pattern(regexp = "^https://[^\\s]+$", message = "AI_ROUTER_URL_HTTPS_REQUIRED") String baseUrl,
        @Size(max = 300) String apiKey,
        @NotBlank @Size(max = 40) String mode1Label,
        @Size(max = 120) String mode1Model,
        @NotBlank @Size(max = 40) String mode2Label,
        @Size(max = 120) String mode2Model,
        @Size(max = 4000) String systemPrompt,
        boolean enabled,
        @NotNull Long expectedVersion) {}
