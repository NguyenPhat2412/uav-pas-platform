package com.uav.platform.dto.response.weather;

import com.uav.platform.enums.weather.FlightClearanceLevel;

import java.util.List;

/**
 * Flight-safety assessment for one place and hour. Wind speeds are m/s at 10, 80 and 120 m above
 * ground; {@code effectiveMaxWindMs} is the stricter of the system and service wind limits.
 */
public record WeatherAssessmentResponse(
        FlightClearanceLevel clearance,
        int safetyScore,
        List<String> reasonCodes,
        double effectiveMaxWindMs,
        String evaluatedTime,
        boolean forecast,
        String provider,
        boolean fromCache,
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
        Integer weatherCode,
        Double kpIndex,
        double batteryDrainMultiplier,
        List<RecommendedWindowResponse> recommendedWindows) {}
