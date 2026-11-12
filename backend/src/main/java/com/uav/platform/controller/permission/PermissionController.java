package com.uav.platform.controller.permission;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.response.permission.PermissionCodesResponse;
import com.uav.platform.dto.response.permission.PermissionResponse;
import com.uav.platform.dto.response.permission.UserPermissionResponse;
import com.uav.platform.enums.permission.PermissionCode;
import com.uav.platform.service.permission.PermissionService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.Permissions.BASE)
@RequiredArgsConstructor
public class PermissionController {
    private final PermissionService permissionService;

    @GetMapping(ApiRoutes.Permissions.ME)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PermissionCodesResponse> current(Authentication authentication) {
        return ResponseEntity.ok(permissionService.current(authentication));
    }

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<List<PermissionResponse>> list() {
        return ResponseEntity.ok(permissionService.list());
    }

    @GetMapping(ApiRoutes.Permissions.BY_USER)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<List<UserPermissionResponse>> listUser(@PathVariable Long userId) {
        return ResponseEntity.ok(permissionService.listUserPermissions(userId));
    }

    @PutMapping(ApiRoutes.Permissions.BY_USER_CODE)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<Void> set(
            @PathVariable Long userId,
            @PathVariable PermissionCode code,
            @RequestParam boolean granted,
            Authentication authentication) {
        permissionService.setUserPermission(userId, code, granted, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping(ApiRoutes.Permissions.BY_USER_CODE)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<Void> reset(
            @PathVariable Long userId,
            @PathVariable PermissionCode code,
            Authentication authentication) {
        permissionService.removeUserPermission(userId, code, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
