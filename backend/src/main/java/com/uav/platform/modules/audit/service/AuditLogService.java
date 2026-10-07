package com.uav.platform.modules.audit.service;


import com.uav.platform.modules.audit.config.response.AuditLogResponse;
import com.uav.platform.modules.audit.common.AuditAction;
import com.uav.platform.common.dto.response.PageResponse;
import org.springframework.data.domain.Pageable;

public interface AuditLogService {
    void record(Long actorUserId, String actorUsername, AuditAction action,
                String entityType, String entityId, String details);

    PageResponse<AuditLogResponse> findAll(Pageable pageable);
}
