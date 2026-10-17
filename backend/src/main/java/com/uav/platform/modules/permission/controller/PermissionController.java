package com.uav.platform.modules.permission.controller;

import com.uav.platform.modules.permission.dto.response.PermissionResponse;
import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.permission.service.PermissionService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/permissions")
public class PermissionController {
    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<String>> current(Authentication authentication) {
        return ResponseEntity.ok(
                java.util.Arrays.stream(PermissionCode.values())
                        .filter(code -> permissionService.has(authentication, code.name()))
                        .map(Enum::name)
                        .toList());
    }

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<List<PermissionResponse>> list() {
        return ResponseEntity.ok(permissionService.list());
    }

    @GetMapping("/users/{userId}")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<
                    List<com.uav.platform.modules.permission.dto.response.UserPermissionResponse>>
            listUser(@PathVariable Long userId) {
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
