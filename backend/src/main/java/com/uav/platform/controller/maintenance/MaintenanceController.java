package com.uav.platform.controller.maintenance;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.maintenance.*;
import com.uav.platform.dto.response.maintenance.*;
import com.uav.platform.enums.maintenance.DueStatus;
import com.uav.platform.enums.maintenance.RepairStatus;
import com.uav.platform.service.maintenance.MaintenanceService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiRoutes.Maintenance.BASE)
@PreAuthorize("@permissionService.has(authentication, 'UAV_MANAGE')")
@RequiredArgsConstructor
public class MaintenanceController {
    private final MaintenanceService service;

    @GetMapping(ApiRoutes.Maintenance.SCHEDULES)
    public ResponseEntity<PageResponse<MaintenanceScheduleResponse>> schedules(
            @RequestParam(required = false) Long uavId,
            @RequestParam(required = false) DueStatus dueStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                service.schedules(
                        new MaintenanceScheduleQueryRequest(uavId, dueStatus),
                        Pageables.strictDesc(page, size, "id", "MAINTENANCE_INVALID_PAGE")));
    }

    @PostMapping(ApiRoutes.Maintenance.SCHEDULES)
    public ResponseEntity<MaintenanceScheduleResponse> createSchedule(
            @Valid @RequestBody CreateMaintenanceScheduleRequest r, Authentication auth) {
        return ResponseEntity.status(201).body(service.createSchedule(r, auth.getName()));
    }

    @PutMapping(ApiRoutes.Maintenance.SCHEDULES_BY_ID)
    public ResponseEntity<MaintenanceScheduleResponse> updateSchedule(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMaintenanceScheduleRequest r,
            Authentication auth) {
        return ResponseEntity.ok(service.updateSchedule(id, r, auth.getName()));
    }

    @GetMapping(ApiRoutes.Maintenance.ORDERS)
    public ResponseEntity<PageResponse<RepairOrderResponse>> orders(
            @RequestParam(required = false) Long uavId,
            @RequestParam(required = false) RepairStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                service.orders(
                        new RepairOrderQueryRequest(uavId, status),
                        Pageables.strictDesc(page, size, "id", "MAINTENANCE_INVALID_PAGE")));
    }

    @GetMapping(ApiRoutes.Maintenance.ORDERS_BY_ID)
    public ResponseEntity<RepairOrderResponse> order(@PathVariable Long id) {
        return ResponseEntity.ok(service.order(id));
    }

    @PostMapping(ApiRoutes.Maintenance.ORDERS)
    public ResponseEntity<RepairOrderResponse> createOrder(
            @Valid @RequestBody CreateRepairOrderRequest r, Authentication auth) {
        return ResponseEntity.status(201).body(service.createOrder(r, auth.getName()));
    }

    @PutMapping(ApiRoutes.Maintenance.ORDERS_BY_ID)
    public ResponseEntity<RepairOrderResponse> updateOrder(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRepairOrderRequest r,
            Authentication auth) {
        return ResponseEntity.ok(service.updateOrder(id, r, auth.getName()));
    }

    @PostMapping(ApiRoutes.Maintenance.ORDERS_START)
    public ResponseEntity<RepairOrderResponse> start(
            @PathVariable Long id,
            @Valid @RequestBody RepairOrderVersionRequest r,
            Authentication auth) {
        return ResponseEntity.ok(service.start(id, r, auth.getName()));
    }

    @PutMapping(ApiRoutes.Maintenance.ORDERS_MATERIALS)
    public ResponseEntity<RepairOrderResponse> materials(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRepairMaterialsRequest r,
            Authentication auth) {
        return ResponseEntity.ok(service.materials(id, r, auth.getName()));
    }

    @PostMapping(ApiRoutes.Maintenance.ORDERS_COMPLETE)
    public ResponseEntity<RepairOrderResponse> complete(
            @PathVariable Long id,
            @Valid @RequestBody CompleteRepairOrderRequest r,
            Authentication auth) {
        return ResponseEntity.ok(service.complete(id, r, auth.getName()));
    }

    @PostMapping(ApiRoutes.Maintenance.ORDERS_CANCEL)
    public ResponseEntity<RepairOrderResponse> cancel(
            @PathVariable Long id,
            @Valid @RequestBody CancelRepairOrderRequest r,
            Authentication auth) {
        return ResponseEntity.ok(service.cancel(id, r, auth.getName()));
    }
}
