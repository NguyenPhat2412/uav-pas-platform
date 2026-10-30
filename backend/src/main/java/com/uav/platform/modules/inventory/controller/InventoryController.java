package com.uav.platform.modules.inventory.controller;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.modules.inventory.dto.request.*;
import com.uav.platform.modules.inventory.dto.response.*;
import com.uav.platform.modules.inventory.service.InventoryService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiRoutes.Inventory.EQUIPMENT)
@RequiredArgsConstructor
public class InventoryController {
    private final InventoryService service;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'INVENTORY_READ')")
    public ResponseEntity<PageResponse<EquipmentResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.list(Pageables.asc(page, size, "name")));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionService.has(authentication, 'INVENTORY_READ')")
    public ResponseEntity<EquipmentResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.get(id));
    }

    @GetMapping("/history")
    @PreAuthorize("@permissionService.has(authentication, 'INVENTORY_READ')")
    public ResponseEntity<PageResponse<InventoryMovementResponse>> history(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(service.history(Pageables.desc(page, size, "createdAt")));
    }

    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'INVENTORY_MANAGE')")
    public ResponseEntity<EquipmentResponse> create(
            @Valid @RequestBody EquipmentRequest r, Authentication a) {
        return ResponseEntity.status(201).body(service.create(r, a.getName()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.has(authentication, 'INVENTORY_MANAGE')")
    public ResponseEntity<EquipmentResponse> update(
            @PathVariable Long id, @Valid @RequestBody EquipmentRequest r, Authentication a) {
        return ResponseEntity.ok(service.update(id, r, a.getName()));
    }

    @PostMapping("/{id}/stock-in")
    @PreAuthorize("@permissionService.has(authentication, 'INVENTORY_MANAGE')")
    public ResponseEntity<EquipmentResponse> stockIn(
            @PathVariable Long id, @Valid @RequestBody QuantityRequest r, Authentication a) {
        return ResponseEntity.ok(service.stockIn(id, r, a.getName()));
    }

    @PostMapping("/{id}/stock-out")
    @PreAuthorize("@permissionService.has(authentication, 'INVENTORY_MANAGE')")
    public ResponseEntity<EquipmentResponse> stockOut(
            @PathVariable Long id, @Valid @RequestBody QuantityRequest r, Authentication a) {
        return ResponseEntity.ok(service.stockOut(id, r, a.getName()));
    }

    @PostMapping("/{id}/reserve")
    @PreAuthorize("@permissionService.has(authentication, 'INVENTORY_MANAGE')")
    public ResponseEntity<EquipmentResponse> reserve(
            @PathVariable Long id, @Valid @RequestBody QuantityRequest r, Authentication a) {
        return ResponseEntity.ok(service.reserve(id, r, a.getName()));
    }

    @PostMapping("/{id}/release")
    @PreAuthorize("@permissionService.has(authentication, 'INVENTORY_MANAGE')")
    public ResponseEntity<EquipmentResponse> release(
            @PathVariable Long id, @Valid @RequestBody QuantityRequest r, Authentication a) {
        return ResponseEntity.ok(service.release(id, r, a.getName()));
    }

    @PostMapping("/{id}/transfer/{stationId}")
    @PreAuthorize("@permissionService.has(authentication, 'INVENTORY_MANAGE')")
    public ResponseEntity<EquipmentResponse> transfer(
            @PathVariable Long id,
            @PathVariable Long stationId,
            @Valid @RequestBody QuantityRequest r,
            Authentication a) {
        return ResponseEntity.ok(service.transfer(id, stationId, r, a.getName()));
    }
}
