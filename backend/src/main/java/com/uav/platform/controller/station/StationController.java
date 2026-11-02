package com.uav.platform.controller.station;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.station.StationRequest;
import com.uav.platform.dto.request.station.StationStatusRequest;
import com.uav.platform.dto.response.station.StationResponse;
import com.uav.platform.enums.station.StationStatus;
import com.uav.platform.service.station.StationService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiRoutes.Stations.BASE)
@RequiredArgsConstructor
public class StationController {
    private final StationService service;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'STATION_VIEW')")
    public ResponseEntity<PageResponse<StationResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) StationStatus status) {
        return ResponseEntity.ok(service.list(search, status, Pageables.asc(page, size, "name")));
    }

    @GetMapping(ApiRoutes.Stations.BY_ID)
    @PreAuthorize("@permissionService.has(authentication, 'STATION_VIEW')")
    public ResponseEntity<StationResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.get(id));
    }

    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'STATION_CREATE')")
    public ResponseEntity<StationResponse> create(
            @Valid @RequestBody StationRequest request, Authentication auth) {
        return ResponseEntity.status(201).body(service.create(request, auth.getName()));
    }

    @PutMapping(ApiRoutes.Stations.BY_ID)
    @PreAuthorize("@permissionService.has(authentication, 'STATION_UPDATE')")
    public ResponseEntity<StationResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody StationRequest request,
            Authentication auth) {
        return ResponseEntity.ok(service.update(id, request, auth.getName()));
    }

    @PatchMapping(ApiRoutes.Stations.STATUS)
    @PreAuthorize("@permissionService.has(authentication, 'STATION_STATUS_UPDATE')")
    public ResponseEntity<StationResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StationStatusRequest request,
            Authentication auth) {
        return ResponseEntity.ok(service.updateStatus(id, request.status(), auth.getName()));
    }

    /** 204 when the unused station is gone; 200 with the station when it was deactivated instead. */
    @DeleteMapping(ApiRoutes.Stations.BY_ID)
    @PreAuthorize("@permissionService.has(authentication, 'STATION_STATUS_UPDATE')")
    public ResponseEntity<StationResponse> delete(@PathVariable Long id, Authentication auth) {
        return service.delete(id, auth.getName())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
