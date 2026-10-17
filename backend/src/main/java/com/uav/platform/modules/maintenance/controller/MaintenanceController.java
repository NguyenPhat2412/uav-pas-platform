package com.uav.platform.modules.maintenance.controller;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.maintenance.dto.request.*;
import com.uav.platform.modules.maintenance.dto.response.*;
import com.uav.platform.modules.maintenance.enums.DueStatus;
import com.uav.platform.modules.maintenance.enums.RepairStatus;
import com.uav.platform.modules.maintenance.service.MaintenanceService;

import jakarta.validation.Valid;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/maintenance")
@PreAuthorize("@permissionService.has(authentication, 'UAV_MANAGE')")
public class MaintenanceController {
    private final MaintenanceService service;

    public MaintenanceController(MaintenanceService service) {
        this.service = service;
    }

    @GetMapping("/schedules")
    public PageResponse<MaintenanceScheduleResponse> schedules(
            @RequestParam(required = false) Long uavId,
            @RequestParam(required = false) DueStatus dueStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.schedules(uavId, dueStatus, page(page, size));
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
        return service.orders(uavId, status, page(page, size));
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

    private PageRequest page(int page, int size) {
        if (page < 0 || size < 1 || size > 100)
            throw SystemException.badRequest("MAINTENANCE_INVALID_PAGE");
        return PageRequest.of(page, size, Sort.by("id").descending());
    }
}
