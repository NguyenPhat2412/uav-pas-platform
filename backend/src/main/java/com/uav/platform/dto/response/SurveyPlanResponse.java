package com.uav.platform.dto.response;

import java.util.List;

/** Generated sweep: waypoints in flying order, line spacing (m), path length (m) and flight time (min). */
public record SurveyPlanResponse(
        List<List<Double>> waypoints,
        double lineSpacingMeters,
        double lengthMeters,
        double estimatedMinutes) {}
