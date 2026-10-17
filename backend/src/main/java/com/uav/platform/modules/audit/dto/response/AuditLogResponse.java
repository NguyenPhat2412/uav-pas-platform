package com.uav.platform.modules.audit.dto.response;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.audit.enums.AuditAction;

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
