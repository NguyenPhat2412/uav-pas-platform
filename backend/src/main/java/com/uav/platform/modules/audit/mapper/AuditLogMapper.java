package com.uav.platform.modules.audit.mapper;

import com.uav.platform.modules.audit.config.response.AuditLogResponse;
import com.uav.platform.modules.audit.entity.AuditLog;

public final class AuditLogMapper {
    private AuditLogMapper() {}
    public static AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(log.getId(), log.getActorUserId(), log.getActorUsername(),
                log.getAction(), log.getEntityType(), log.getEntityId(), log.getDetails(), log.getCreatedAt());
    }
}
