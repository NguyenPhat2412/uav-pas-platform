package com.uav.platform.controller.simulation;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.simulation.SimulationCommandRequest;
import com.uav.platform.dto.request.simulation.SimulationStartRequest;
import com.uav.platform.dto.request.simulation.SurveyPlanRequest;
import com.uav.platform.dto.response.simulation.SimulationRunLogResponse;
import com.uav.platform.dto.response.simulation.SimulationStateResponse;
import com.uav.platform.dto.response.simulation.SurveyPlanResponse;
import com.uav.platform.service.simulation.SimulationService;

import io.swagger.v3.oas.annotations.Operation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Validated
@RestController
@RequestMapping(ApiRoutes.Simulation.BASE)
@RequiredArgsConstructor
public class SimulationController {
    private final SimulationService simulation;

    @Operation(summary = "List simulated flights")
    @GetMapping(ApiRoutes.Simulation.SESSIONS)
    @PreAuthorize("@permissionService.has(authentication, 'UAV_VIEW')")
    public ResponseEntity<List<SimulationStateResponse>> list() {
        return ResponseEntity.ok(simulation.list());
    }

    @Operation(summary = "List persisted digital flight rehearsal logs")
    @GetMapping(ApiRoutes.Simulation.RUNS)
    @PreAuthorize("@permissionService.has(authentication, 'UAV_VIEW')")
    public ResponseEntity<List<SimulationRunLogResponse>> runs(
            @RequestParam(required = false) Long uavId,
            @RequestParam(required = false) Long missionId) {
        return ResponseEntity.ok(simulation.runs(uavId, missionId));
    }

    @Operation(summary = "Live state of a UAV's simulated flight")
    @GetMapping(ApiRoutes.Simulation.SESSION)
    @PreAuthorize("@permissionService.has(authentication, 'UAV_VIEW')")
    public ResponseEntity<SimulationStateResponse> state(@PathVariable Long uavId) {
        return ResponseEntity.ok(simulation.state(uavId));
    }

    @Operation(
            summary = "Start a simulated flight; its telemetry is ingested like a real gateway's")
    @PostMapping(ApiRoutes.Simulation.SESSIONS)
    @PreAuthorize("@permissionService.has(authentication, 'UAV_UPDATE')")
    public ResponseEntity<SimulationStateResponse> start(
            @Valid @RequestBody SimulationStartRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(simulation.start(request, auth.getName()));
    }

    @Operation(
            summary =
                    "Start a 1-click digital flight rehearsal for any mission using its assigned or an available UAV")
    @PostMapping(ApiRoutes.Simulation.REHEARSE_MISSION)
    @PreAuthorize("@permissionService.has(authentication, 'UAV_UPDATE')")
    public ResponseEntity<SimulationStateResponse> rehearseMission(
            @PathVariable Long missionId,
            @RequestParam(required = false) @DecimalMin("0") @DecimalMax("25") Double windSpeedMs,
            @RequestParam(required = false) @DecimalMin("0") @DecimalMax("360")
                    Double windDirectionDeg,
            @RequestParam(required = false) @DecimalMin("0.5") @DecimalMax("5") Double timeScale,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        simulation.rehearseMission(
                                missionId,
                                windSpeedMs,
                                windDirectionDeg,
                                timeScale,
                                auth.getName()));
    }

    @Operation(summary = "Send PAUSE, RESUME, RETURN_TO_HOME or LAND to a simulated UAV")
    @PostMapping(ApiRoutes.Simulation.SESSION_COMMANDS)
    @PreAuthorize("@permissionService.has(authentication, 'UAV_UPDATE')")
    public ResponseEntity<SimulationStateResponse> command(
            @PathVariable Long uavId,
            @Valid @RequestBody SimulationCommandRequest request,
            Authentication auth) {
        return ResponseEntity.ok(simulation.command(uavId, request.command(), auth.getName()));
    }

    @Operation(summary = "End a simulated flight and discard its state")
    @DeleteMapping(ApiRoutes.Simulation.SESSION)
    @PreAuthorize("@permissionService.has(authentication, 'UAV_UPDATE')")
    public ResponseEntity<Void> stop(@PathVariable Long uavId, Authentication auth) {
        simulation.stop(uavId, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Generate a lawnmower survey path for a polygon")
    @PostMapping(ApiRoutes.Simulation.SURVEY_PLAN)
    @PreAuthorize("@permissionService.has(authentication, 'UAV_VIEW')")
    public ResponseEntity<SurveyPlanResponse> surveyPlan(
            @Valid @RequestBody SurveyPlanRequest request) {
        return ResponseEntity.ok(simulation.surveyPlan(request));
    }
}
