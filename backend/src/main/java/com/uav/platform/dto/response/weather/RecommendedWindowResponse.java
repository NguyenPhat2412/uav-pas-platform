package com.uav.platform.dto.response.weather;

import com.uav.platform.enums.weather.FlightClearanceLevel;

/** One suggested daytime take-off hour, best safety score first. */
public record RecommendedWindowResponse(
        String startTime,
        FlightClearanceLevel clearance,
        Double windSpeed80mMs,
        Double windGustsMs,
        Integer precipitationProbabilityPct,
        int safetyScore) {}
