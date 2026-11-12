package com.uav.platform.controller.sar;

import com.uav.platform.config.routes.ApiRoutes;
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
import com.uav.platform.service.sar.SarService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.Sar.BASE)
@RequiredArgsConstructor
public class SarController {

    private final SarService sarService;

    @PostMapping(ApiRoutes.Sar.MISSIONS)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_CREATE') or @permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<SarMissionResponse> registerSar(
            @Valid @RequestBody SarMissionRequest request, Authentication auth) {
        return ResponseEntity.status(201).body(sarService.registerSar(request, auth));
    }

    @GetMapping(ApiRoutes.Sar.MISSIONS)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_VIEW') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<List<SarCockpitMissionResponse>> list(
            @RequestParam(defaultValue = "false") boolean includeClosed,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Authentication auth) {
        return ResponseEntity.ok(sarService.listForCockpit(includeClosed, page, size, auth));
    }

    @PostMapping(ApiRoutes.Sar.MISSIONS_RETURN_TO_HOME)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<RescueDispatchResponse> returnToHome(
            @PathVariable Long missionId, Authentication auth) {
        return ResponseEntity.ok(sarService.requestReturnToHome(missionId, auth));
    }

    @GetMapping(ApiRoutes.Sar.MISSION_BY_ID)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_VIEW') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<SarMissionResponse> getByMissionId(
            @PathVariable Long missionId, Authentication auth) {
        return ResponseEntity.ok(sarService.getByMissionId(missionId, auth));
    }

    @PatchMapping(ApiRoutes.Sar.MISSION_STATUS)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<SarMissionResponse> updateStatus(
            @PathVariable Long missionId, @RequestParam SarStatus status, Authentication auth) {
        return ResponseEntity.ok(sarService.updateSarStatus(missionId, status, auth));
    }

    @PostMapping(ApiRoutes.Sar.FLIGHT_PLAN)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_VIEW') or @permissionService.has(authentication, 'MISSION_CREATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<FlightPlanResponse> generateFlightPlan(
            @RequestBody FlightPlanRequest request, Authentication auth) {
        return ResponseEntity.ok(sarService.generateFlightPlan(request, auth));
    }

    @PostMapping(ApiRoutes.Sar.TELEMETRY_EVALUATE)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<TelemetryEvaluateResponse> evaluateTelemetry(
            @RequestBody TelemetryEvaluateRequest request, Authentication auth) {
        return ResponseEntity.ok(sarService.evaluateTelemetry(request, auth));
    }

    @PostMapping(ApiRoutes.Sar.DISPATCH_RESCUE)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<RescueDispatchResponse> dispatchRescue(
            @PathVariable Long missionId,
            @RequestBody(required = false) RescueDispatchRequest request,
            Authentication auth) {
        return ResponseEntity.ok(sarService.dispatchRescueCoordinates(missionId, request, auth));
    }
}
