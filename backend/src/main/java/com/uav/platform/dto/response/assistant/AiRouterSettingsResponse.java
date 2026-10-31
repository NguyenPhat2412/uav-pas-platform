package com.uav.platform.dto.response.assistant;

import java.time.LocalDateTime;

/** Settings as shown to admins; the API key itself never leaves the server, only whether one is set and its last 4 chars. */
public record AiRouterSettingsResponse(
        String baseUrl,
        boolean apiKeyConfigured,
        String apiKeyHint,
        String mode1Label,
        String mode1Model,
        String mode2Label,
        String mode2Model,
        String systemPrompt,
        boolean enabled,
        long version,
        LocalDateTime updatedAt,
        String updatedBy) {}
