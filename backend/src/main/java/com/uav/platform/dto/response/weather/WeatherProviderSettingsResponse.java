package com.uav.platform.dto.response.weather;

import com.uav.platform.enums.weather.WeatherProviderType;

import java.time.LocalDateTime;

/** Weather source settings for administrators; the key itself never leaves the server. */
public record WeatherProviderSettingsResponse(
        WeatherProviderType provider,
        boolean apiKeyConfigured,
        int cacheTtlMinutes,
        boolean enforcePreflightBlock,
        LocalDateTime updatedAt,
        String updatedBy) {}
