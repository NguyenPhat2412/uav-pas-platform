package com.uav.platform.modules.audit.controller;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.modules.audit.dto.request.AuditLogQueryRequest;
import com.uav.platform.modules.audit.dto.response.AuditLogResponse;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;

import lombok.RequiredArgsConstructor;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {
    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'AUDIT_READ')")
    public ResponseEntity<PageResponse<AuditLogResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        AuditLogQueryRequest query = new AuditLogQueryRequest(actor, action, entityType, entityId, from, to);
        if (query.equals(AuditLogQueryRequest.none())) return list(page, size);
        return ResponseEntity.ok(auditLogService.findAll(query, Pageables.desc(page, size, "createdAt")));
    }

    /** Unfiltered listing; also the path taken when no filter parameter is supplied. */
    public ResponseEntity<PageResponse<AuditLogResponse>> list(int page, int size) {
        return ResponseEntity.ok(auditLogService.findAll(Pageables.desc(page, size, "createdAt")));
    }
}
