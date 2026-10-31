package com.uav.platform.controller.devicekey;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.devicekey.CreateDeviceKeyRequest;
import com.uav.platform.dto.response.devicekey.CreatedDeviceKeyResponse;
import com.uav.platform.dto.response.devicekey.DeviceKeyResponse;
import com.uav.platform.service.devicekey.DeviceKeyService;

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
