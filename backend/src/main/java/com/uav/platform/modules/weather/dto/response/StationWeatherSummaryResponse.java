package com.uav.platform.modules.weather.dto.response;

/** Current flying conditions at one ground station. */
public record StationWeatherSummaryResponse(
        Long stationId,
        String code,
        String name,
        Double latitude,
        Double longitude,
        WeatherAssessmentResponse assessment) {}
