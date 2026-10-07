package com.uav.platform.modules.audit.controller;


import com.uav.platform.modules.audit.config.response.AuditLogResponse;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.common.dto.response.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditLogController {
    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'AUDIT_READ')")
    public ResponseEntity<PageResponse<AuditLogResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(auditLogService.findAll(PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt"))));
    }
}
