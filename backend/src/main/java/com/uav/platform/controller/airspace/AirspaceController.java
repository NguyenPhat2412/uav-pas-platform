package com.uav.platform.controller.airspace;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.airspace.AirspaceCheckRequest;
import com.uav.platform.dto.request.airspace.AirspaceZoneUpsertRequest;
import com.uav.platform.dto.response.airspace.AirspaceCheckResponse;
import com.uav.platform.dto.response.airspace.AirspaceZoneResponse;
import com.uav.platform.service.airspace.AirspaceService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.Airspace.BASE)
@RequiredArgsConstructor
public class AirspaceController {

    private final AirspaceService airspaceService;

    @GetMapping(ApiRoutes.Airspace.ZONES)
    public ResponseEntity<List<AirspaceZoneResponse>> listZones(
            @RequestParam(defaultValue = "true") boolean activeOnly,
            Authentication authentication) {
        return ResponseEntity.ok(airspaceService.listZones(activeOnly, authentication));
    }

    @PostMapping(ApiRoutes.Airspace.CHECK)
    public ResponseEntity<AirspaceCheckResponse> check(
            @Valid @RequestBody AirspaceCheckRequest request) {
        return ResponseEntity.ok(airspaceService.check(request));
    }

    @PostMapping(ApiRoutes.Airspace.ZONES)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<AirspaceZoneResponse> createZone(
            @Valid @RequestBody AirspaceZoneUpsertRequest request, Authentication authentication) {
        return ResponseEntity.status(201).body(airspaceService.createZone(request, authentication));
    }

    @PutMapping(ApiRoutes.Airspace.ZONE_BY_ID)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<AirspaceZoneResponse> updateZone(
            @PathVariable Long id,
            @Valid @RequestBody AirspaceZoneUpsertRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(airspaceService.updateZone(id, request, authentication));
    }

    @DeleteMapping(ApiRoutes.Airspace.ZONE_BY_ID)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<Void> deleteZone(@PathVariable Long id, Authentication authentication) {
        airspaceService.deleteZone(id, authentication);
        return ResponseEntity.noContent().build();
    }
}
