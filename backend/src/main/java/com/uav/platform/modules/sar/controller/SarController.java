package com.uav.platform.modules.sar.controller;

import com.uav.platform.modules.sar.dto.request.FlightPlanRequest;
import com.uav.platform.modules.sar.dto.request.SarMissionRequest;
import com.uav.platform.modules.sar.dto.request.TelemetryEvaluateRequest;
import com.uav.platform.modules.sar.dto.response.FlightPlanResponse;
import com.uav.platform.modules.sar.dto.response.SarMissionResponse;
import com.uav.platform.modules.sar.dto.response.TelemetryEvaluateResponse;
import com.uav.platform.modules.sar.enums.SarStatus;
import com.uav.platform.modules.sar.service.SarService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/sar")
public class SarController {

    private final SarService sarService;

    public SarController(SarService sarService) {
        this.sarService = sarService;
    }

    @PostMapping("/missions")
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_CREATE') or @permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<SarMissionResponse> registerSar(
            @Valid @RequestBody SarMissionRequest request, Authentication auth) {
        return ResponseEntity.status(201).body(sarService.registerSar(request, auth));
    }

    @GetMapping("/missions/{missionId}")
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_VIEW') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<SarMissionResponse> getByMissionId(
            @PathVariable Long missionId, Authentication auth) {
        return ResponseEntity.ok(sarService.getByMissionId(missionId, auth));
    }

    @PatchMapping("/missions/{missionId}/status")
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<SarMissionResponse> updateStatus(
            @PathVariable Long missionId, @RequestParam SarStatus status, Authentication auth) {
        return ResponseEntity.ok(sarService.updateSarStatus(missionId, status, auth));
    }

    @PostMapping("/flight-plan")
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_VIEW') or @permissionService.has(authentication, 'MISSION_CREATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<FlightPlanResponse> generateFlightPlan(
            @RequestBody FlightPlanRequest request, Authentication auth) {
        return ResponseEntity.ok(sarService.generateFlightPlan(request, auth));
    }

    @PostMapping("/telemetry-evaluate")
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<TelemetryEvaluateResponse> evaluateTelemetry(
            @RequestBody TelemetryEvaluateRequest request, Authentication auth) {
        return ResponseEntity.ok(sarService.evaluateTelemetry(request, auth));
    }

    @PostMapping("/missions/{missionId}/dispatch-rescue")
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<Map<String, Object>> dispatchRescue(
            @PathVariable Long missionId,
            @RequestBody(required = false) Map<String, Object> payload,
            Authentication auth) {
        return ResponseEntity.ok(sarService.dispatchRescueCoordinates(missionId, payload, auth));
    }
}
