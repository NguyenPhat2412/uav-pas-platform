package com.uav.platform.controller;

import com.uav.platform.config.ApiRoutes;
import com.uav.platform.dto.response.BackupStatusResponse;
import com.uav.platform.dto.response.DatabaseStatusResponse;
import com.uav.platform.dto.response.DeploymentInfoResponse;
import com.uav.platform.dto.response.EmailStatusResponse;
import com.uav.platform.dto.response.EmailTestResponse;
import com.uav.platform.dto.response.StorageStatusResponse;
import com.uav.platform.service.BackupStatusService;
import com.uav.platform.service.InfrastructureService;
import com.uav.platform.service.MailDiagnosticsService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only views of the production stack for admins. Nothing here restarts, restores or runs commands; those stay
 * SSH-only (deploy/DEPLOY.md). The single write is a test email to the caller's own address.
 */
@RestController
@RequestMapping(ApiRoutes.Admin.INFRASTRUCTURE)
@RequiredArgsConstructor
public class InfrastructureController {
    private final InfrastructureService infrastructure;
    private final BackupStatusService backups;
    private final MailDiagnosticsService mail;

    @GetMapping(ApiRoutes.Admin.INFRASTRUCTURE_DEPLOYMENT)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<DeploymentInfoResponse> deployment() {
        return ResponseEntity.ok(infrastructure.deployment());
    }

    @GetMapping(ApiRoutes.Admin.INFRASTRUCTURE_BACKUPS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<BackupStatusResponse> backups() {
        return ResponseEntity.ok(backups.status());
    }

    @GetMapping(ApiRoutes.Admin.INFRASTRUCTURE_STORAGE)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<StorageStatusResponse> storage() {
        return ResponseEntity.ok(infrastructure.storage());
    }

    @GetMapping(ApiRoutes.Admin.INFRASTRUCTURE_DATABASE)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<DatabaseStatusResponse> database() {
        return ResponseEntity.ok(infrastructure.database());
    }

    @GetMapping(ApiRoutes.Admin.INFRASTRUCTURE_EMAIL)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<EmailStatusResponse> email(Authentication authentication) {
        return ResponseEntity.ok(mail.status(authentication));
    }

    /** Recipient is always the caller; there is deliberately no request body. */
    @PostMapping(ApiRoutes.Admin.INFRASTRUCTURE_EMAIL_TEST)
    @PreAuthorize("@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')")
    public ResponseEntity<EmailTestResponse> sendTestEmail(Authentication authentication) {
        return ResponseEntity.ok(mail.sendTest(authentication));
    }
}
