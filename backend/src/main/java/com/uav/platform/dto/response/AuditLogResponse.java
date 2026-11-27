package com.uav.platform.dto.response;

import com.uav.platform.enums.*;
import com.uav.platform.enums.AuditAction;

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
