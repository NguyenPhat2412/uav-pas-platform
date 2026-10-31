package com.uav.platform.service.sar;

import com.uav.platform.dto.request.sar.FlightPlanRequest;
import com.uav.platform.dto.request.sar.RescueDispatchRequest;
import com.uav.platform.dto.request.sar.SarMissionRequest;
import com.uav.platform.dto.request.sar.TelemetryEvaluateRequest;
import com.uav.platform.dto.response.sar.FlightPlanResponse;
import com.uav.platform.dto.response.sar.RescueDispatchResponse;
import com.uav.platform.dto.response.sar.SarCockpitMissionResponse;
import com.uav.platform.dto.response.sar.SarMissionResponse;
import com.uav.platform.dto.response.sar.TelemetryEvaluateResponse;
import com.uav.platform.enums.sar.SarStatus;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface SarService {
    SarMissionResponse registerSar(SarMissionRequest request, Authentication authentication);

    /** SAR missions visible to the caller, most recently updated first; RESCUED ones only when asked. */
    default List<SarCockpitMissionResponse> listForCockpit(
            boolean includeClosed, Authentication authentication) {
        return listForCockpit(includeClosed, 0, DEFAULT_COCKPIT_PAGE_SIZE, authentication);
    }

    /** Cockpit page size when the client does not ask for one. */
    int DEFAULT_COCKPIT_PAGE_SIZE = 50;

    /** One page (size 1..200) of the cockpit list, same order and visibility as above. */
    List<SarCockpitMissionResponse> listForCockpit(
            boolean includeClosed, int page, int size, Authentication authentication);

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
