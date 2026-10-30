package com.uav.platform.modules.user.controller;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.modules.user.dto.request.AdminCreateUserRequest;
import com.uav.platform.modules.user.dto.request.BulkLockRequest;
import com.uav.platform.modules.user.dto.request.PasswordResetRequest;
import com.uav.platform.modules.user.dto.response.BulkActionResponse;
import com.uav.platform.modules.user.dto.response.UserResponse;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.service.UserAdministrationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping(ApiRoutes.Users.BASE)
@Tag(
        name = "User administration",
        description = "Provisioning, password reset, bulk locking and export")
@RequiredArgsConstructor
public class UserAdministrationController {
    private final UserAdministrationService service;

    @Operation(summary = "Create an account with a chosen role")
    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<UserResponse> create(
            @Valid @RequestBody AdminCreateUserRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(request, authentication.getName()));
    }

    @Operation(summary = "Set a new password and revoke the user's sessions")
    @PostMapping(ApiRoutes.Users.USER_ID + "/reset-password")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<Void> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody PasswordResetRequest request,
            Authentication authentication) {
        service.resetPassword(id, request, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Lock or unlock several accounts")
    @PostMapping("/bulk-lock")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<BulkActionResponse> bulkLock(
            @Valid @RequestBody BulkLockRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.bulkLock(request, authentication.getName()));
    }

    @Operation(summary = "Export the filtered user list as CSV")
    @GetMapping(value = "/export", produces = "text/csv")
    @PreAuthorize("@permissionService.has(authentication, 'USER_READ')")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) UserStatus status) {
        byte[] body = service.exportCsv(keyword, role, status).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"users.csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(body);
    }
}
