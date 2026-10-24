package com.uav.platform.modules.dashboard.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Admin health snapshot. status is UP, DEGRADED, DOWN or UNKNOWN. Details carry counts and versions only, never
 * hostnames, credentials or bucket names.
 */
public record SystemHealthResponse(String status, LocalDateTime checkedAt, List<Component> components, Runtime runtime) {

    public record Component(String key, String status, Long latencyMs, Map<String, Object> details) {}

    public record Runtime(long uptimeSeconds, long heapUsedMb, long heapMaxMb, int processors, double systemLoad,
                          String javaVersion) {}
}
