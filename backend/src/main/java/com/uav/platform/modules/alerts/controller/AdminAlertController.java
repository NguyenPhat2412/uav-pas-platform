package com.uav.platform.modules.alerts.controller;

import com.uav.platform.modules.alerts.dto.response.AlertCenterResponse;
import com.uav.platform.modules.alerts.service.AlertCenterService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/alerts")
@RequiredArgsConstructor
public class AdminAlertController {
    private final AlertCenterService alerts;

    @GetMapping
    @PreAuthorize(
            "hasAuthority('ROLE_ADMIN') and @permissionService.has(authentication, 'DASHBOARD_READ')")
    public ResponseEntity<AlertCenterResponse> current() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(alerts.current());
    }
}
