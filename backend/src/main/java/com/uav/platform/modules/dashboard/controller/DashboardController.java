package com.uav.platform.modules.dashboard.controller;

import com.uav.platform.modules.dashboard.dto.response.AdminAnalyticsResponse;
import com.uav.platform.modules.dashboard.dto.response.CustomerAnalyticsResponse;
import com.uav.platform.modules.dashboard.dto.response.DashboardResponse;
import com.uav.platform.modules.dashboard.dto.response.FleetMapResponse;
import com.uav.platform.modules.dashboard.dto.response.MissionDashboardResponse;
import com.uav.platform.modules.dashboard.service.AdminAnalyticsService;
import com.uav.platform.modules.dashboard.service.CustomerAnalyticsService;
import com.uav.platform.modules.dashboard.service.DashboardService;
import com.uav.platform.modules.dashboard.service.FleetMapService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService service;
    private final AdminAnalyticsService analytics;
    private final CustomerAnalyticsService customerAnalytics;
    private final FleetMapService fleetMap;

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

    @GetMapping("/analytics")
    @PreAuthorize("@permissionService.has(authentication, 'DASHBOARD_READ')")
    public ResponseEntity<AdminAnalyticsResponse> analytics(
            @RequestParam(defaultValue = "30") int days, Authentication authentication) {
        return ResponseEntity.ok(analytics.analytics(days, authentication));
    }

    /** The caller's own missions, invoices and quota; no other customer's data is reachable here. */
    @GetMapping("/customer-analytics")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<CustomerAnalyticsResponse> customerAnalytics(Authentication authentication) {
        return ResponseEntity.ok(customerAnalytics.analytics(authentication));
    }

    @GetMapping("/fleet-map")
    @PreAuthorize("@permissionService.has(authentication, 'UAV_READ')")
    public ResponseEntity<FleetMapResponse> fleetMap() {
        return ResponseEntity.ok(fleetMap.fleetMap());
    }
}
