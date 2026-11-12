package com.uav.platform.dto.response.settings;

import java.time.LocalDateTime;

public record SystemConfigurationHistoryResponse(
        Long id,
        String configKey,
        String oldValue,
        String newValue,
        String changedBy,
        LocalDateTime changedAt) {}
