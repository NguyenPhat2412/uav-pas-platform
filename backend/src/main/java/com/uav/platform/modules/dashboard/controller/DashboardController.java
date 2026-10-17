package com.uav.platform.modules.dashboard.controller;

import com.uav.platform.modules.dashboard.dto.response.DashboardResponse;
import com.uav.platform.modules.dashboard.dto.response.MissionDashboardResponse;
import com.uav.platform.modules.dashboard.service.DashboardService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    @PreAuthorize("@permissionService.has(authentication, 'DASHBOARD_READ')")
    public ResponseEntity<DashboardResponse> summary(Authentication authentication) {
        return ResponseEntity.ok(service.summary(authentication));
    }

    @GetMapping("/missions")
    @PreAuthorize("@permissionService.has(authentication, 'DASHBOARD_MISSION')")
    public ResponseEntity<MissionDashboardResponse> missions(Authentication authentication) {
        return ResponseEntity.ok(service.missionSummary(authentication));
    }
}
