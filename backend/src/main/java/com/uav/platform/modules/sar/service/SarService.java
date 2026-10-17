package com.uav.platform.modules.sar.service;

import com.uav.platform.modules.sar.dto.request.FlightPlanRequest;
import com.uav.platform.modules.sar.dto.request.RescueDispatchRequest;
import com.uav.platform.modules.sar.dto.request.SarMissionRequest;
import com.uav.platform.modules.sar.dto.request.TelemetryEvaluateRequest;
import com.uav.platform.modules.sar.dto.response.FlightPlanResponse;
import com.uav.platform.modules.sar.dto.response.RescueDispatchResponse;
import com.uav.platform.modules.sar.dto.response.SarMissionResponse;
import com.uav.platform.modules.sar.dto.response.TelemetryEvaluateResponse;
import com.uav.platform.modules.sar.enums.SarStatus;

import org.springframework.security.core.Authentication;

public interface SarService {
    SarMissionResponse registerSar(SarMissionRequest request, Authentication authentication);

    SarMissionResponse getByMissionId(Long missionId, Authentication authentication);

    SarMissionResponse updateSarStatus(
            Long missionId, SarStatus status, Authentication authentication);

    FlightPlanResponse generateFlightPlan(FlightPlanRequest request, Authentication authentication);

    TelemetryEvaluateResponse evaluateTelemetry(
            TelemetryEvaluateRequest request, Authentication authentication);

    RescueDispatchResponse dispatchRescueCoordinates(
            Long missionId, RescueDispatchRequest request, Authentication authentication);
}
