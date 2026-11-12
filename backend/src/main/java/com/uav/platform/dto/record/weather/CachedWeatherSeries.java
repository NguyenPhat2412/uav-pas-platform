package com.uav.platform.dto.record.weather;

import java.time.LocalDateTime;
import java.util.List;

/** One grid cell's full Open-Meteo hourly series, kept in memory until the cache TTL passes. */
public record CachedWeatherSeries(LocalDateTime fetchedAt, List<HourlyWeatherSlot> slots) {}
