package com.uav.platform.controller.billing;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.billing.ServicePlanRequest;
import com.uav.platform.dto.request.billing.ServicePlanUpdateRequest;
import com.uav.platform.dto.response.billing.PlanStatsResponse;
import com.uav.platform.dto.response.billing.ServicePlanResponse;
import com.uav.platform.service.billing.PlanAdministrationService;
import com.uav.platform.service.billing.PlanStatisticsService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.Billing.ADMIN_PLANS)
@RequiredArgsConstructor
public class PlanAdministrationController {
    private final PlanAdministrationService plans;
    private final PlanStatisticsService statistics;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<List<ServicePlanResponse>> listAll() {
        return ResponseEntity.ok(plans.listAll());
    }

    /** Subscribers, usage and revenue per plan; months (1..24, default 6) sizes the monthly series. */
    @GetMapping("/stats")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<PlanStatsResponse> stats(@RequestParam(defaultValue = "6") int months) {
        return ResponseEntity.ok(statistics.stats(months));
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
