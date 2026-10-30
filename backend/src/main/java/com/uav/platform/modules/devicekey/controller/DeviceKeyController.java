package com.uav.platform.modules.devicekey.controller;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.modules.devicekey.dto.request.CreateDeviceKeyRequest;
import com.uav.platform.modules.devicekey.dto.response.CreatedDeviceKeyResponse;
import com.uav.platform.modules.devicekey.dto.response.DeviceKeyResponse;
import com.uav.platform.modules.devicekey.service.DeviceKeyService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Telemetry device credentials. The full key is only ever in the create response. */
@RestController
@RequestMapping(ApiRoutes.Admin.DEVICE_KEYS)
@RequiredArgsConstructor
public class DeviceKeyController {
    private final DeviceKeyService deviceKeys;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<List<DeviceKeyResponse>> list() {
        return ResponseEntity.ok(deviceKeys.list());
    }

    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<CreatedDeviceKeyResponse> create(
            @Valid @RequestBody CreateDeviceKeyRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .cacheControl(CacheControl.noStore())
                .body(deviceKeys.create(request, auth.getName()));
    }

    @PostMapping("/{id}/revoke")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<DeviceKeyResponse> revoke(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(deviceKeys.revoke(id, auth.getName()));
    }
}
