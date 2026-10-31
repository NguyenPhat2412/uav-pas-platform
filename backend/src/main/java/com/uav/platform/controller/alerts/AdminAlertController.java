package com.uav.platform.controller.alerts;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.response.alerts.AlertCenterResponse;
import com.uav.platform.service.alerts.AlertCenterService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.Admin.ALERTS)
@RequiredArgsConstructor
public class AdminAlertController {
    private final AlertCenterService service;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<AlertCenterResponse> current() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.current());
    }
}
