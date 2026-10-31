package com.uav.platform.dto.record.weather;

import com.uav.platform.enums.weather.FlightClearanceLevel;

import java.util.List;

/** Clearance of one hour with its 0–100 score and the rule codes that lowered it. */
public record SafetyVerdict(
        FlightClearanceLevel clearance, int safetyScore, List<String> reasonCodes) {}
