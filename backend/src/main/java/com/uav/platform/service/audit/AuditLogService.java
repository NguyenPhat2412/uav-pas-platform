package com.uav.platform.service.audit;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.audit.AuditLogQueryRequest;
import com.uav.platform.dto.response.audit.AuditLogResponse;
import com.uav.platform.enums.audit.AuditAction;

import org.springframework.data.domain.Pageable;

public interface AuditLogService {
    void record(
            Long actorUserId,
            String actorUsername,
            AuditAction action,
            String entityType,
            String entityId,
            String details);

    PageResponse<AuditLogResponse> findAll(Pageable pageable);

    PageResponse<AuditLogResponse> findAll(AuditLogQueryRequest query, Pageable pageable);
}
