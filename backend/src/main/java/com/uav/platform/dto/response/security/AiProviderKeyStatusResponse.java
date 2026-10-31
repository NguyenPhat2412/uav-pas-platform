package com.uav.platform.dto.response.security;

import java.time.LocalDateTime;

/** The AI provider key lives encrypted in ai_router_settings; only its presence is reported. */
public record AiProviderKeyStatusResponse(
        boolean configured, LocalDateTime updatedAt, String updatedBy) {}
