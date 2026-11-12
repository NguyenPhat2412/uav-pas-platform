package com.uav.platform.dto.record.weather;

import java.util.List;

/** Hourly series starting at the evaluated hour, plus the geomagnetic Kp index for that hour. */
public record WeatherForecastData(
        List<HourlyWeatherSlot> hours, Double kpIndex, String provider, boolean fromCache) {}
