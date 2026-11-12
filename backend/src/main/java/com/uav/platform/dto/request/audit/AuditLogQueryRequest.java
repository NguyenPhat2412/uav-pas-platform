package com.uav.platform.dto.request.audit;

import com.uav.platform.enums.audit.AuditAction;

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
