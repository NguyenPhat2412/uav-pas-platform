package com.uav.platform.dto.record;

import com.uav.platform.enums.FlightClearanceLevel;

import java.util.List;

/** Clearance of one hour with its 0–100 score and the rule codes that lowered it. */
public record SafetyVerdict(
        FlightClearanceLevel clearance, int safetyScore, List<String> reasonCodes) {}
