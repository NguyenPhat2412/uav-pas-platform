package com.uav.platform.controller.security;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.security.SecuritySessionQueryRequest;
import com.uav.platform.dto.request.security.TwoFactorResetRequest;
import com.uav.platform.dto.response.security.SecretsOverviewResponse;
import com.uav.platform.dto.response.security.SecurityActionResponse;
import com.uav.platform.dto.response.security.SecurityPolicyResponse;
import com.uav.platform.dto.response.security.SecuritySessionResponse;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.service.security.SecurityConfigStatusService;
import com.uav.platform.service.security.SecuritySessionService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** Admin security console: sessions, 2FA reset, auth policy and secret health (read-only). */
@RestController
@RequestMapping(ApiRoutes.Admin.SECURITY)
@RequiredArgsConstructor
public class SecurityAdminController {
    private final SecuritySessionService sessions;
    private final SecurityConfigStatusService configStatus;

    @GetMapping(ApiRoutes.Admin.SECURITY_SESSIONS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<PageResponse<SecuritySessionResponse>> sessions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UserRole role,
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(
                sessions.sessions(
                        new SecuritySessionQueryRequest(page, size, keyword, role, activeOnly)));
    }

    @PostMapping(ApiRoutes.Admin.SECURITY_USERS_REVOKE_SESSIONS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<SecurityActionResponse> revokeUserSessions(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(sessions.revokeUserSessions(id, auth));
    }

    @PostMapping(ApiRoutes.Admin.SECURITY_REVOKE_ALL_SESSIONS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<SecurityActionResponse> revokeAllSessions(Authentication auth) {
        return ResponseEntity.ok(sessions.revokeAllSessions(auth));
    }

    @PostMapping(ApiRoutes.Admin.SECURITY_USERS_RESET_2FA)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<SecurityActionResponse> resetTwoFactor(
            @PathVariable Long id,
            @RequestBody(required = false) TwoFactorResetRequest request,
            Authentication auth) {
        return ResponseEntity.ok(sessions.resetTwoFactor(id, request, auth));
    }

    @GetMapping(ApiRoutes.Admin.SECURITY_POLICY)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<SecurityPolicyResponse> policy() {
        return ResponseEntity.ok(configStatus.policy());
    }

    @GetMapping(ApiRoutes.Admin.SECURITY_SECRETS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<SecretsOverviewResponse> secrets() {
        return ResponseEntity.ok(configStatus.secrets());
    }
}
