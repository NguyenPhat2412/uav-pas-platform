package com.uav.platform.dto.response.settings;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * A setting and the rule the server enforces on save. minValue/maxValue are numeric bounds for
 * INTEGER/DECIMAL and length bounds for STRING; emptyAllowed tells the editor a blank value is
 * accepted (env fallback for billing keys, hidden item for contact keys).
 */
public record SystemConfigurationResponse(
        Long id,
        String configKey,
        String configValue,
        String category,
        String description,
        LocalDateTime updatedAt,
        String updatedBy,
        String valueType,
        BigDecimal minValue,
        BigDecimal maxValue,
        List<String> allowedValues,
        String valuePattern,
        boolean isPublic,
        boolean emptyAllowed) {}
