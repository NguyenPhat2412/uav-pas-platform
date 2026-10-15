package com.uav.platform.modules.uav.controller;


import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.uav.config.request.UavRequest;
import com.uav.platform.modules.uav.config.response.UavResponse;
import com.uav.platform.modules.uav.config.response.UavStatusHistoryResponse;
import com.uav.platform.modules.uav.common.UavStatus;
import com.uav.platform.modules.uav.service.UavService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/uavs")
public class UavController {
    private final UavService service;
    public UavController(UavService service) { this.service = service; }
    @GetMapping @PreAuthorize("@permissionService.has(authentication, 'UAV_READ')")
    public ResponseEntity<PageResponse<UavResponse>> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.list(PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }
    @GetMapping("/{id}") @PreAuthorize("@permissionService.has(authentication, 'UAV_READ')")
    public ResponseEntity<UavResponse> get(@PathVariable Long id) { return ResponseEntity.ok(service.get(id)); }
    @PostMapping @PreAuthorize("@permissionService.has(authentication, 'UAV_MANAGE')")
    public ResponseEntity<UavResponse> create(@Valid @RequestBody UavRequest request, Authentication auth) { return ResponseEntity.status(201).body(service.create(request, auth.getName())); }
    @PutMapping("/{id}") @PreAuthorize("@permissionService.has(authentication, 'UAV_MANAGE')")
    public ResponseEntity<UavResponse> update(@PathVariable Long id, @Valid @RequestBody UavRequest request, Authentication auth) { return ResponseEntity.ok(service.update(id, request, auth.getName())); }
    @PutMapping("/{id}/station/{stationId}") @PreAuthorize("@permissionService.has(authentication, 'UAV_MANAGE')")
    public ResponseEntity<UavResponse> assign(@PathVariable Long id, @PathVariable Long stationId, Authentication auth) { return ResponseEntity.ok(service.assign(id, stationId, auth.getName())); }
    @PutMapping("/{id}/status") @PreAuthorize("@permissionService.has(authentication, 'UAV_MANAGE')")
    public ResponseEntity<UavResponse> status(@PathVariable Long id, @RequestParam UavStatus status,
            @RequestParam(required = false) String reason, @RequestParam(required = false) UavStatus expectedStatus,
            Authentication auth) { return ResponseEntity.ok(service.changeStatus(id, status, reason, expectedStatus, auth.getName())); }
    @PostMapping("/{id}/maintenance") @PreAuthorize("@permissionService.has(authentication, 'UAV_MANAGE')")
    public ResponseEntity<UavResponse> maintenance(@PathVariable Long id, @RequestParam(required = false) String reason,
            @RequestParam(required = false) UavStatus expectedStatus, Authentication auth) {
        return ResponseEntity.ok(service.maintenance(id, reason, expectedStatus, auth.getName()));
    }
    @GetMapping("/{id}/history") @PreAuthorize("@permissionService.has(authentication, 'UAV_READ')")
    public ResponseEntity<PageResponse<UavStatusHistoryResponse>> history(@PathVariable Long id, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(service.history(id, PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }
}
