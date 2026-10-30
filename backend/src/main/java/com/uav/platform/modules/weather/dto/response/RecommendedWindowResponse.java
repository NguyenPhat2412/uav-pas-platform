package com.uav.platform.modules.weather.dto.response;

import com.uav.platform.modules.weather.enums.FlightClearanceLevel;

/** One suggested daytime take-off hour, best safety score first. */
public record RecommendedWindowResponse(
        String startTime,
        FlightClearanceLevel clearance,
        Double windSpeed80mMs,
        Double windGustsMs,
        Integer precipitationProbabilityPct,
        int safetyScore) {}
