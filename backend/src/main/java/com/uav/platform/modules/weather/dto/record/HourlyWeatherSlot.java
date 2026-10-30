package com.uav.platform.modules.weather.dto.record;

/** One forecast hour (local time {@code yyyy-MM-ddTHH:mm}); any value may be missing. */
public record HourlyWeatherSlot(
        String time,
        Double temperatureC,
        Integer humidityPct,
        Double windSpeed10mMs,
        Double windSpeed80mMs,
        Double windSpeed120mMs,
        Double windGustsMs,
        Integer windDirectionDeg,
        Double visibilityMeters,
        Double precipitationMm,
        Integer precipitationProbabilityPct,
        Integer cloudCoverPct,
        Integer weatherCode) {}
