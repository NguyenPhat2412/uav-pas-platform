package com.uav.platform.modules.mission.controller;

import com.uav.platform.modules.mission.dto.request.ServiceOfferingRequest;
import com.uav.platform.modules.mission.dto.response.ServiceOfferingResponse;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.mapper.ServiceOfferingMapper;
import com.uav.platform.modules.mission.repository.ServiceOfferingRepository;
import com.uav.platform.modules.mission.specification.ServiceOfferingSpecifications;

import jakarta.validation.Valid;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/uav-services")
public class ServiceOfferingController {
    private final ServiceOfferingRepository services;

    public ServiceOfferingController(ServiceOfferingRepository services) {
        this.services = services;
    }

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<List<ServiceOfferingResponse>> list() {
        return ResponseEntity.ok(
                services
                        .findAll(Specification.where(ServiceOfferingSpecifications.isActive()))
                        .stream()
                        .map(ServiceOfferingMapper::toResponse)
                        .toList());
    }

    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CONFIRM')")
    public ResponseEntity<ServiceOfferingResponse> create(
            @Valid @RequestBody ServiceOfferingRequest request) {
        if (services.findByCode(request.code()).isPresent())
            throw new IllegalStateException("Service code already exists");
        return ResponseEntity.status(201)
                .body(
                        ServiceOfferingMapper.toResponse(
                                services.save(ServiceOfferingMapper.toEntity(request))));
    }
}
