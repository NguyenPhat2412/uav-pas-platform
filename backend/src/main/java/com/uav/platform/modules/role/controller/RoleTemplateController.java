package com.uav.platform.modules.role.controller;

import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.role.dto.response.RoleTemplateResponse;
import com.uav.platform.modules.role.service.RoleTemplateService;
import com.uav.platform.modules.user.enums.UserRole;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/role-templates")
@PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
public class RoleTemplateController {
    private final RoleTemplateService service;

    public RoleTemplateController(RoleTemplateService service) {
        this.service = service;
    }

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
