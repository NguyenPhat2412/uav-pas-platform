package com.uav.platform.modules.weather.dto.record;

/**
 * Limits from the admin settings; {@code serviceMaxWindMs} is the stricter wind limit of the
 * booked service, when it has one.
 */
public record SafetyThresholds(
        double systemMaxWindMs,
        Double serviceMaxWindMs,
        double maxWindGustMs,
        double minVisibilityMeters,
        double maxPrecipitationMm,
        double maxKpIndex) {}
