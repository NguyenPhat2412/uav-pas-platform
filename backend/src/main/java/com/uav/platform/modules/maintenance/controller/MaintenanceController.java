package com.uav.platform.modules.maintenance.controller;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.modules.maintenance.dto.request.*;
import com.uav.platform.modules.maintenance.dto.response.*;
import com.uav.platform.modules.maintenance.enums.DueStatus;
import com.uav.platform.modules.maintenance.enums.RepairStatus;
import com.uav.platform.modules.maintenance.service.MaintenanceService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/maintenance")
@PreAuthorize("@permissionService.has(authentication, 'UAV_MANAGE')")
@RequiredArgsConstructor
public class MaintenanceController {
    private final MaintenanceService service;

    @GetMapping("/schedules")
    public PageResponse<MaintenanceScheduleResponse> schedules(
            @RequestParam(required = false) Long uavId,
            @RequestParam(required = false) DueStatus dueStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.schedules(
                new MaintenanceScheduleQueryRequest(uavId, dueStatus),
                Pageables.strictDesc(page, size, "id", "MAINTENANCE_INVALID_PAGE"));
    }

    @PostMapping("/schedules")
    public ResponseEntity<MaintenanceScheduleResponse> createSchedule(
            @Valid @RequestBody CreateMaintenanceScheduleRequest r, Authentication auth) {
        return ResponseEntity.status(201).body(service.createSchedule(r, auth.getName()));
    }

    @PutMapping("/schedules/{id}")
    public MaintenanceScheduleResponse updateSchedule(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMaintenanceScheduleRequest r,
            Authentication auth) {
        return service.updateSchedule(id, r, auth.getName());
    }

    @GetMapping("/orders")
    public PageResponse<RepairOrderResponse> orders(
            @RequestParam(required = false) Long uavId,
            @RequestParam(required = false) RepairStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.orders(
                new RepairOrderQueryRequest(uavId, status),
                Pageables.strictDesc(page, size, "id", "MAINTENANCE_INVALID_PAGE"));
    }

    @GetMapping("/orders/{id}")
    public RepairOrderResponse order(@PathVariable Long id) {
        return service.order(id);
    }

    @PostMapping("/orders")
    public ResponseEntity<RepairOrderResponse> createOrder(
            @Valid @RequestBody CreateRepairOrderRequest r, Authentication auth) {
        return ResponseEntity.status(201).body(service.createOrder(r, auth.getName()));
    }

    @PutMapping("/orders/{id}")
    public RepairOrderResponse updateOrder(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRepairOrderRequest r,
            Authentication auth) {
        return service.updateOrder(id, r, auth.getName());
    }

    @PostMapping("/orders/{id}/start")
    public RepairOrderResponse start(
            @PathVariable Long id,
            @Valid @RequestBody RepairOrderVersionRequest r,
            Authentication auth) {
        return service.start(id, r, auth.getName());
    }

    @PutMapping("/orders/{id}/materials")
    public RepairOrderResponse materials(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRepairMaterialsRequest r,
            Authentication auth) {
        return service.materials(id, r, auth.getName());
    }

    @PostMapping("/orders/{id}/complete")
    public RepairOrderResponse complete(
            @PathVariable Long id,
            @Valid @RequestBody CompleteRepairOrderRequest r,
            Authentication auth) {
        return service.complete(id, r, auth.getName());
    }

    @PostMapping("/orders/{id}/cancel")
    public RepairOrderResponse cancel(
            @PathVariable Long id,
            @Valid @RequestBody CancelRepairOrderRequest r,
            Authentication auth) {
        return service.cancel(id, r, auth.getName());
    }
}
