package com.uav.platform.controller.uav;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.uav.TelemetryReportRequest;
import com.uav.platform.dto.response.uav.TelemetryResponse;
import com.uav.platform.service.uav.TelemetryService;

import io.swagger.v3.oas.annotations.Operation;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Device telemetry: ground stations push samples, portals read the latest. 204 means the UAV has not reported. */
@RestController
@RequestMapping(ApiRoutes.API_V1_PREFIX)
@RequiredArgsConstructor
public class TelemetryController {
    private final TelemetryService telemetry;

    /**
     * Devices authenticate with X-Device-Key (scope TELEMETRY_WRITE, bound UAV only); users need
     * UAV_MANAGE. A device principal is never evaluated as a user.
     */
    @Operation(summary = "Report a telemetry sample (device key or gateway service account)")
    @PostMapping("/uavs/{id}/telemetry")
    @PreAuthorize(
            "@deviceKeyService.isDevice(authentication)"
                    + " ? @deviceKeyService.canWriteTelemetry(authentication, #id)"
                    + " : @permissionService.has(authentication, 'UAV_MANAGE')")
    public ResponseEntity<TelemetryResponse> report(
            @PathVariable Long id,
            @Valid @RequestBody TelemetryReportRequest request,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(telemetry.ingest(id, request, auth.getName()));
    }

    @GetMapping("/uavs/{id}/telemetry/latest")
    @PreAuthorize("@permissionService.has(authentication, 'UAV_READ')")
    public ResponseEntity<TelemetryResponse> latest(@PathVariable Long id) {
        return telemetry
                .latest(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/uavs/telemetry/latest")
    @PreAuthorize("@permissionService.has(authentication, 'UAV_READ')")
    public ResponseEntity<List<TelemetryResponse>> fleet() {
        return ResponseEntity.ok(telemetry.latestForFleet());
    }

    /** For anyone who may see the mission (its customer included): the assigned UAV's latest sample. */
    @GetMapping("/missions/{id}/telemetry/latest")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<TelemetryResponse> forMission(
            @PathVariable Long id, Authentication auth) {
        return telemetry
                .latestForMission(id, auth)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
