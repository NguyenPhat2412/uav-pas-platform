package com.uav.platform.dto.record.simulation;

import com.uav.platform.dto.request.uav.TelemetryReportRequest;

import java.time.LocalDateTime;

/** A telemetry sample still travelling over the simulated link. */
public record SimPendingSample(TelemetryReportRequest report, LocalDateTime deliverAt, long latencyMs) {}
