package com.uav.platform.modules.mission.controller;

import com.uav.platform.modules.mission.mapper.UavServiceMapper;

import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.config.request.UavServiceRequest;
import com.uav.platform.modules.mission.config.response.UavServiceResponse;
import com.uav.platform.modules.mission.entity.UavService;
import com.uav.platform.modules.mission.repository.UavServiceRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.jpa.domain.Specification;
import com.uav.platform.modules.mission.specification.UavServiceSpecifications;

import java.util.List;

@RestController
@RequestMapping("/api/v1/uav-services")
public class UavServiceController {
    private final UavServiceRepository services;
    public UavServiceController(UavServiceRepository services) { this.services = services; }

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<List<UavServiceResponse>> list() {
        return ResponseEntity.ok(services.findAll(Specification.where(UavServiceSpecifications.isActive()))
                .stream().map(UavServiceMapper::toResponse).toList());
    }

    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CONFIRM')")
    public ResponseEntity<UavServiceResponse> create(@Valid @RequestBody UavServiceRequest request) {
        if (services.findByCode(request.code()).isPresent()) throw new IllegalStateException("Service code already exists");
        return ResponseEntity.status(201).body(UavServiceMapper.toResponse(services.save(new UavService(request.code(), request.name(), request.description(), request.defaultDurationMinutes()))));
    }
}
