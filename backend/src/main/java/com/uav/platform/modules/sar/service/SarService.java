package com.uav.platform.modules.sar.service;

import com.uav.platform.modules.sar.common.SarStatus;
import com.uav.platform.modules.sar.config.request.FlightPlanRequest;
import com.uav.platform.modules.sar.config.request.SarMissionRequest;
import com.uav.platform.modules.sar.config.request.TelemetryEvaluateRequest;
import com.uav.platform.modules.sar.config.response.FlightPlanResponse;
import com.uav.platform.modules.sar.config.response.SarMissionResponse;
import com.uav.platform.modules.sar.config.response.TelemetryEvaluateResponse;
import org.springframework.security.core.Authentication;

import java.util.Map;

public interface SarService {
    SarMissionResponse registerSar(SarMissionRequest request, Authentication authentication);
    SarMissionResponse getByMissionId(Long missionId, Authentication authentication);
    SarMissionResponse updateSarStatus(Long missionId, SarStatus status, Authentication authentication);
    FlightPlanResponse generateFlightPlan(FlightPlanRequest request, Authentication authentication);
    TelemetryEvaluateResponse evaluateTelemetry(TelemetryEvaluateRequest request, Authentication authentication);
    Map<String, Object> dispatchRescueCoordinates(Long missionId, Map<String, Object> payload, Authentication authentication);
}
