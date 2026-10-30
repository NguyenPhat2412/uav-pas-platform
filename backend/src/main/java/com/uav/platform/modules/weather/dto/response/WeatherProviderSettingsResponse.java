package com.uav.platform.modules.weather.dto.response;

import com.uav.platform.modules.weather.enums.WeatherProviderType;

import java.time.LocalDateTime;

/** Weather source settings for administrators; the key itself never leaves the server. */
public record WeatherProviderSettingsResponse(
        WeatherProviderType provider,
        boolean apiKeyConfigured,
        int cacheTtlMinutes,
        boolean enforcePreflightBlock,
        LocalDateTime updatedAt,
        String updatedBy) {}
