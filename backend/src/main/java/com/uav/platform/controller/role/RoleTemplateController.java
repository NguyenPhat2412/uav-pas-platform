package com.uav.platform.controller.role;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.response.role.RoleTemplateResponse;
import com.uav.platform.enums.permission.PermissionCode;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.service.role.RoleTemplateService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.RoleTemplates.BASE)
@PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
@RequiredArgsConstructor
public class RoleTemplateController {
    private final RoleTemplateService service;

    @GetMapping
    public ResponseEntity<List<RoleTemplateResponse>> list() {
        return ResponseEntity.ok(service.list());
    }

    @PutMapping("/{role}/permissions/{code}")
    public ResponseEntity<Void> set(
            @PathVariable UserRole role,
            @PathVariable PermissionCode code,
            @RequestParam boolean granted,
            Authentication authentication) {
        service.setPermission(role, code, granted, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
