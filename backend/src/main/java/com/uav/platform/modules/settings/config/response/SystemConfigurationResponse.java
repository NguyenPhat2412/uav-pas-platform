package com.uav.platform.modules.settings.config.response;

import java.time.LocalDateTime;

public record SystemConfigurationResponse(
    Long id,
    String configKey,
    String configValue,
    String category,
    String description,
    LocalDateTime updatedAt,
    String updatedBy
) {}
