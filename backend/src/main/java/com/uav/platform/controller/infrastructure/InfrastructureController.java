package com.uav.platform.controller.infrastructure;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.response.infrastructure.BackupStatusResponse;
import com.uav.platform.dto.response.infrastructure.DatabaseStatusResponse;
import com.uav.platform.dto.response.infrastructure.DeploymentInfoResponse;
import com.uav.platform.dto.response.infrastructure.EmailStatusResponse;
import com.uav.platform.dto.response.infrastructure.EmailTestResponse;
import com.uav.platform.dto.response.infrastructure.StorageStatusResponse;
import com.uav.platform.service.infrastructure.BackupStatusService;
import com.uav.platform.service.infrastructure.InfrastructureService;
import com.uav.platform.service.infrastructure.MailDiagnosticsService;

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

    @GetMapping("/deployment")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<DeploymentInfoResponse> deployment() {
        return ResponseEntity.ok(infrastructure.deployment());
    }

    @GetMapping("/backups")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<BackupStatusResponse> backups() {
        return ResponseEntity.ok(backups.status());
    }

    @GetMapping("/storage")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<StorageStatusResponse> storage() {
        return ResponseEntity.ok(infrastructure.storage());
    }

    @GetMapping("/database")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<DatabaseStatusResponse> database() {
        return ResponseEntity.ok(infrastructure.database());
    }

    @GetMapping("/email")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<EmailStatusResponse> email(Authentication authentication) {
        return ResponseEntity.ok(mail.status(authentication));
    }

    /** Recipient is always the caller; there is deliberately no request body. */
    @PostMapping("/email/test")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<EmailTestResponse> sendTestEmail(Authentication authentication) {
        return ResponseEntity.ok(mail.sendTest(authentication));
    }
}
