package com.uav.platform.modules.weather.dto.request;

import com.uav.platform.modules.weather.enums.WeatherProviderType;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Weather source settings. {@code apiKey}: null keeps the stored key, an empty string removes it,
 * any other value replaces it (stored only as AES-256-GCM text).
 */
public record WeatherProviderUpdateRequest(
        @NotNull WeatherProviderType provider,
        @Size(max = 256) String apiKey,
        @Min(1) @Max(120) int cacheTtlMinutes,
        boolean enforcePreflightBlock) {}
