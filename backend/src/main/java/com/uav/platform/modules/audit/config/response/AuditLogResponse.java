package com.uav.platform.modules.audit.config.response;

import com.uav.platform.modules.audit.common.*;

import com.uav.platform.modules.audit.common.AuditAction;

import java.time.LocalDateTime;

public record AuditLogResponse(Long id, Long actorUserId, String actorUsername,
                               AuditAction action, String entityType, String entityId,
                               String details, LocalDateTime createdAt) { }
