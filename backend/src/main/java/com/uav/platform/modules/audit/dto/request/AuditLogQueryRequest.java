package com.uav.platform.modules.audit.dto.request;

import com.uav.platform.modules.audit.enums.AuditAction;

import java.time.LocalDate;

/** Optional audit-log filters; every null field is ignored. */
public record AuditLogQueryRequest(
        String actor,
        AuditAction action,
        String entityType,
        String entityId,
        LocalDate from,
        LocalDate to) {

    public static AuditLogQueryRequest none() {
        return new AuditLogQueryRequest(null, null, null, null, null, null);
    }
}
