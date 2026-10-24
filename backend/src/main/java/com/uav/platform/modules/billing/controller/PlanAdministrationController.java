package com.uav.platform.modules.billing.controller;

import com.uav.platform.modules.billing.dto.request.ServicePlanRequest;
import com.uav.platform.modules.billing.dto.request.ServicePlanUpdateRequest;
import com.uav.platform.modules.billing.dto.response.ServicePlanResponse;
import com.uav.platform.modules.billing.service.PlanAdministrationService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/billing/admin/plans")
@RequiredArgsConstructor
public class PlanAdministrationController {
    private final PlanAdministrationService plans;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<List<ServicePlanResponse>> listAll() {
        return ResponseEntity.ok(plans.listAll());
    }

    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<ServicePlanResponse> create(
            @Valid @RequestBody ServicePlanRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(plans.create(request, auth.getName()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<ServicePlanResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ServicePlanUpdateRequest request,
            Authentication auth) {
        return ResponseEntity.ok(plans.update(id, request, auth.getName()));
    }

    @PatchMapping("/{id}/active")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<ServicePlanResponse> setActive(
            @PathVariable Long id, @RequestParam boolean active, Authentication auth) {
        return ResponseEntity.ok(plans.setActive(id, active, auth.getName()));
    }
}
