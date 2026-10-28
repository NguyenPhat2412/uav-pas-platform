package com.uav.platform.modules.settings.dto.response;

import java.time.LocalDateTime;

public record SystemConfigurationHistoryResponse(
        Long id,
        String configKey,
        String oldValue,
        String newValue,
        String changedBy,
        LocalDateTime changedAt) {}
