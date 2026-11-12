package com.uav.platform.dto.response.audit;

import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.audit.AuditAction;

import java.time.LocalDateTime;

public record AuditLogResponse(
        Long id,
        Long actorUserId,
        String actorUsername,
        AuditAction action,
        String entityType,
        String entityId,
        String details,
        LocalDateTime createdAt) {}
