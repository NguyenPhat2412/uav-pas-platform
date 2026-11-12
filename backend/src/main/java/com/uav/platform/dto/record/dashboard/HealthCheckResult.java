package com.uav.platform.dto.record.dashboard;

import java.util.Map;

/** Outcome of one system-health probe before timing is attached. */
public record HealthCheckResult(String status, Map<String, Object> details) {}
