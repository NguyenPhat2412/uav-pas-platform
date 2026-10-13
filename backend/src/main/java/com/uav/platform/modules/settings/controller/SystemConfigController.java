package com.uav.platform.modules.settings.controller;

import com.uav.platform.modules.settings.config.request.UpdateConfigurationRequest;
import com.uav.platform.modules.settings.config.response.SystemConfigurationResponse;
import com.uav.platform.modules.settings.service.SystemConfigService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/settings")
public class SystemConfigController {

    private final SystemConfigService configService;

    public SystemConfigController(SystemConfigService configService) {
        this.configService = configService;
    }

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'DASHBOARD_READ')")
    public ResponseEntity<List<SystemConfigurationResponse>> listSettings() {
        return ResponseEntity.ok(configService.listAll());
    }

    @GetMapping("/{key}")
    @PreAuthorize("@permissionService.has(authentication, 'DASHBOARD_READ')")
    public ResponseEntity<SystemConfigurationResponse> getSetting(@PathVariable String key) {
        return ResponseEntity.ok(configService.getByKey(key));
    }

    @PutMapping("/{key}")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<SystemConfigurationResponse> updateSetting(
        @PathVariable String key,
        @Valid @RequestBody UpdateConfigurationRequest request,
        Authentication auth
    ) {
        return ResponseEntity.ok(configService.update(key, request, auth));
    }
}
