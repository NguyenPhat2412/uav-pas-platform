package com.uav.platform.modules.mission.controller;

import com.uav.platform.modules.mission.dto.request.ServiceOfferingRequest;
import com.uav.platform.modules.mission.dto.response.ServiceOfferingResponse;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.service.ServiceOfferingService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/uav-services")
@RequiredArgsConstructor
public class ServiceOfferingController {
    private final ServiceOfferingService services;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<List<ServiceOfferingResponse>> list() {
        return ResponseEntity.ok(services.list());
    }

    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CONFIRM')")
    public ResponseEntity<ServiceOfferingResponse> create(
            @Valid @RequestBody ServiceOfferingRequest request) {
        return ResponseEntity.status(201).body(services.create(request));
    }
}
