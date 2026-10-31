package com.uav.platform.dto.response.weather;

/** Current flying conditions at one ground station. */
public record StationWeatherSummaryResponse(
        Long stationId,
        String code,
        String name,
        Double latitude,
        Double longitude,
        WeatherAssessmentResponse assessment) {}
