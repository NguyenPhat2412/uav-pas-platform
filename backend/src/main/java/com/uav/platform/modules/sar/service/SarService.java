package com.uav.platform.modules.sar.service;

import com.uav.platform.modules.sar.dto.request.FlightPlanRequest;
import com.uav.platform.modules.sar.dto.request.RescueDispatchRequest;
import com.uav.platform.modules.sar.dto.request.SarMissionRequest;
import com.uav.platform.modules.sar.dto.request.TelemetryEvaluateRequest;
import com.uav.platform.modules.sar.dto.response.FlightPlanResponse;
import com.uav.platform.modules.sar.dto.response.RescueDispatchResponse;
import com.uav.platform.modules.sar.dto.response.SarCockpitMissionResponse;
import com.uav.platform.modules.sar.dto.response.SarMissionResponse;
import com.uav.platform.modules.sar.dto.response.TelemetryEvaluateResponse;
import com.uav.platform.modules.sar.enums.SarStatus;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface SarService {
    SarMissionResponse registerSar(SarMissionRequest request, Authentication authentication);

    /** SAR missions visible to the caller, most recently updated first; RESCUED ones only when asked. */
    List<SarCockpitMissionResponse> listForCockpit(boolean includeClosed, Authentication authentication);

    /** Asks the ground-station integration (webhook SAR_RTH_REQUESTED) to recall the assigned UAV. */
    RescueDispatchResponse requestReturnToHome(Long missionId, Authentication authentication);

    SarMissionResponse getByMissionId(Long missionId, Authentication authentication);

    SarMissionResponse updateSarStatus(
            Long missionId, SarStatus status, Authentication authentication);

    FlightPlanResponse generateFlightPlan(FlightPlanRequest request, Authentication authentication);

    TelemetryEvaluateResponse evaluateTelemetry(
            TelemetryEvaluateRequest request, Authentication authentication);

    RescueDispatchResponse dispatchRescueCoordinates(
            Long missionId, RescueDispatchRequest request, Authentication authentication);
}
