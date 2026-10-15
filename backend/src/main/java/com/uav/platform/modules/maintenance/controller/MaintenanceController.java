package com.uav.platform.modules.maintenance.controller;

import com.uav.platform.modules.maintenance.common.RepairStatus;
import com.uav.platform.modules.maintenance.common.DueStatus;
import com.uav.platform.modules.maintenance.config.request.MaintenanceRequests;
import com.uav.platform.modules.maintenance.config.response.MaintenanceResponses;
import com.uav.platform.modules.maintenance.service.MaintenanceService;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import static com.uav.platform.modules.maintenance.config.request.MaintenanceRequests.*;

@RestController @RequestMapping("/api/v1/maintenance")
@PreAuthorize("@permissionService.has(authentication, 'UAV_MANAGE')")
public class MaintenanceController {
    private final MaintenanceService service;
    public MaintenanceController(MaintenanceService service) { this.service = service; }
    @GetMapping("/schedules")
    public PageResponse<MaintenanceResponses.Schedule> schedules(@RequestParam(required = false) Long uavId,
            @RequestParam(required = false) DueStatus dueStatus, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.schedules(uavId, dueStatus, page(page, size));
    }
    @PostMapping("/schedules")
    public ResponseEntity<MaintenanceResponses.Schedule> createSchedule(@Valid @RequestBody CreateSchedule r, Authentication auth) {
        return ResponseEntity.status(201).body(service.createSchedule(r, auth.getName()));
    }
    @PutMapping("/schedules/{id}")
    public MaintenanceResponses.Schedule updateSchedule(@PathVariable Long id, @Valid @RequestBody UpdateSchedule r, Authentication auth) { return service.updateSchedule(id, r, auth.getName()); }
    @GetMapping("/orders")
    public PageResponse<MaintenanceResponses.Order> orders(@RequestParam(required = false) Long uavId,
            @RequestParam(required = false) RepairStatus status, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.orders(uavId, status, page(page, size));
    }
    @GetMapping("/orders/{id}") public MaintenanceResponses.Order order(@PathVariable Long id) { return service.order(id); }
    @PostMapping("/orders")
    public ResponseEntity<MaintenanceResponses.Order> createOrder(@Valid @RequestBody CreateOrder r, Authentication auth) { return ResponseEntity.status(201).body(service.createOrder(r, auth.getName())); }
    @PutMapping("/orders/{id}")
    public MaintenanceResponses.Order updateOrder(@PathVariable Long id, @Valid @RequestBody UpdateOrder r, Authentication auth) { return service.updateOrder(id, r, auth.getName()); }
    @PostMapping("/orders/{id}/start")
    public MaintenanceResponses.Order start(@PathVariable Long id, @Valid @RequestBody Version r, Authentication auth) { return service.start(id, r, auth.getName()); }
    @PutMapping("/orders/{id}/materials")
    public MaintenanceResponses.Order materials(@PathVariable Long id, @Valid @RequestBody Materials r, Authentication auth) { return service.materials(id, r, auth.getName()); }
    @PostMapping("/orders/{id}/complete")
    public MaintenanceResponses.Order complete(@PathVariable Long id, @Valid @RequestBody Complete r, Authentication auth) { return service.complete(id, r, auth.getName()); }
    @PostMapping("/orders/{id}/cancel")
    public MaintenanceResponses.Order cancel(@PathVariable Long id, @Valid @RequestBody Cancel r, Authentication auth) { return service.cancel(id, r, auth.getName()); }
    private PageRequest page(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw SystemException.badRequest("MAINTENANCE_INVALID_PAGE");
        return PageRequest.of(page, size, Sort.by("id").descending());
    }
}
