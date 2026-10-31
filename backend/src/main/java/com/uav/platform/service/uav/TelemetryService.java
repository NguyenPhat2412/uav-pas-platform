package com.uav.platform.service.uav;

import com.uav.platform.dto.request.uav.TelemetryReportRequest;
import com.uav.platform.dto.response.uav.TelemetryResponse;

import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

/** Stores and serves real device telemetry; nothing is synthesised when a UAV has not reported. */
public interface TelemetryService {
    long FRESH_SECONDS = 120;

    TelemetryResponse ingest(Long uavId, TelemetryReportRequest request, String reporter);

    Optional<TelemetryResponse> latest(Long uavId);

    List<TelemetryResponse> latestForFleet();

    /** The assigned UAV's latest sample, for anyone who may see the mission; empty when unassigned or silent. */
    Optional<TelemetryResponse> latestForMission(Long missionId, Authentication auth);
}
