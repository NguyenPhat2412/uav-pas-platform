package com.uav.platform.modules.audit.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.audit.dto.response.AuditLogResponse;
import com.uav.platform.modules.audit.entity.AuditLog;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.mapper.AuditLogMapper;
import com.uav.platform.modules.audit.repository.AuditLogRepository;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.user.repository.UserRepository;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuditLogServiceImpl implements AuditLogService {
    private final AuditLogRepository repository;
    private final UserRepository users;

    public AuditLogServiceImpl(AuditLogRepository repository) {
        this(repository, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AuditLogServiceImpl(
            AuditLogRepository repository,
            @org.springframework.beans.factory.annotation.Autowired(required = false)
                    UserRepository users) {
        this.repository = repository;
        this.users = users;
    }

    @Override
    public void record(
            Long actorUserId,
            String actorUsername,
            AuditAction action,
            String entityType,
            String entityId,
            String details) {
        Long resolvedActorId = actorUserId;
        if (resolvedActorId == null && users != null && actorUsername != null) {
            resolvedActorId =
                    users.findByUsername(actorUsername)
                            .map(com.uav.platform.modules.user.entity.AppUser::getId)
                            .orElse(null);
        }
        repository.save(
                new AuditLog(
                        resolvedActorId, actorUsername, action, entityType, entityId, details));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> findAll(Pageable pageable) {
        return PageResponse.from(repository.findAll(pageable), AuditLogMapper::toResponse);
    }
}
