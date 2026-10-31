package com.uav.platform.controller.settings;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.settings.UpdateConfigurationRequest;
import com.uav.platform.dto.response.settings.SystemConfigurationHistoryResponse;
import com.uav.platform.dto.response.settings.SystemConfigurationResponse;
import com.uav.platform.service.settings.SystemConfigService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.Settings.BASE)
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemConfigService configService;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<List<SystemConfigurationResponse>> listSettings() {
        return ResponseEntity.ok(configService.listAll());
    }

    @GetMapping("/{key}")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<SystemConfigurationResponse> getSetting(@PathVariable String key) {
        return ResponseEntity.ok(configService.getByKey(key));
    }

    @GetMapping("/{key}/history")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<List<SystemConfigurationHistoryResponse>> history(
            @PathVariable String key, @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(configService.history(key, limit));
    }

    @PutMapping("/{key}")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<SystemConfigurationResponse> updateSetting(
            @PathVariable String key,
            @Valid @RequestBody UpdateConfigurationRequest request,
            Authentication auth) {
        return ResponseEntity.ok(configService.update(key, request, auth));
    }
}
