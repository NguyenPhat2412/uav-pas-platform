package com.uav.platform.modules.settings.dto.response;

import java.time.LocalDateTime;

public record SystemConfigurationResponse(
        Long id,
        String configKey,
        String configValue,
        String category,
        String description,
        LocalDateTime updatedAt,
        String updatedBy) {}
