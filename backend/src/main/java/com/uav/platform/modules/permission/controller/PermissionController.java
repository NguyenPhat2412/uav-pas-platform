package com.uav.platform.modules.permission.controller;

import com.uav.platform.modules.permission.dto.response.PermissionCodesResponse;
import com.uav.platform.modules.permission.dto.response.PermissionResponse;
import com.uav.platform.modules.permission.dto.response.UserPermissionResponse;
import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.permission.service.PermissionService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/permissions")
@RequiredArgsConstructor
public class PermissionController {
    private final PermissionService permissionService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PermissionCodesResponse> current(Authentication authentication) {
        return ResponseEntity.ok(permissionService.current(authentication));
    }

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<List<PermissionResponse>> list() {
        return ResponseEntity.ok(permissionService.list());
    }

    @GetMapping("/users/{userId}")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<List<UserPermissionResponse>> listUser(@PathVariable Long userId) {
        return ResponseEntity.ok(permissionService.listUserPermissions(userId));
    }

    @PutMapping("/users/{userId}/{code}")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<Void> set(
            @PathVariable Long userId,
            @PathVariable PermissionCode code,
            @RequestParam boolean granted,
            Authentication authentication) {
        permissionService.setUserPermission(userId, code, granted, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/users/{userId}/{code}")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<Void> reset(
            @PathVariable Long userId,
            @PathVariable PermissionCode code,
            Authentication authentication) {
        permissionService.removeUserPermission(userId, code, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
