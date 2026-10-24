package com.uav.platform.modules.audit.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.audit.dto.request.AuditLogQueryRequest;
import com.uav.platform.modules.audit.dto.response.AuditLogResponse;
import com.uav.platform.modules.audit.entity.AuditLog;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.mapper.AuditLogMapper;
import com.uav.platform.modules.audit.repository.AuditLogRepository;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.user.repository.UserRepository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuditLogServiceImpl implements AuditLogService {
    private final AuditLogRepository repository;
    private final UserRepository users;
    private final AuditLogMapper auditLogMapper;

    public AuditLogServiceImpl(AuditLogRepository repository) {
        this(repository, null);
    }

    public AuditLogServiceImpl(AuditLogRepository repository, UserRepository users) {
        this(repository, users, org.mapstruct.factory.Mappers.getMapper(AuditLogMapper.class));
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AuditLogServiceImpl(
            AuditLogRepository repository,
            @org.springframework.beans.factory.annotation.Autowired(required = false)
                    UserRepository users,
            AuditLogMapper auditLogMapper) {
        this.repository = repository;
        this.users = users;
        this.auditLogMapper = auditLogMapper;
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
        return PageResponse.from(repository.findAll(pageable), auditLogMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> findAll(AuditLogQueryRequest query, Pageable pageable) {
        return PageResponse.from(
                repository.findAll(filter(query), pageable), auditLogMapper::toResponse);
    }

    static Specification<AuditLog> filter(AuditLogQueryRequest query) {
        return (root, criteria, cb) -> {
            java.util.List<jakarta.persistence.criteria.Predicate> where =
                    new java.util.ArrayList<>();
            if (query.actor() != null && !query.actor().isBlank())
                where.add(
                        cb.like(
                                cb.lower(root.get("actorUsername")),
                                "%"
                                        + query.actor().trim().toLowerCase(java.util.Locale.ROOT)
                                        + "%"));
            if (query.action() != null) where.add(cb.equal(root.get("action"), query.action()));
            if (query.entityType() != null && !query.entityType().isBlank())
                where.add(
                        cb.equal(
                                cb.upper(root.get("entityType")),
                                query.entityType().trim().toUpperCase(java.util.Locale.ROOT)));
            if (query.entityId() != null && !query.entityId().isBlank())
                where.add(cb.equal(root.get("entityId"), query.entityId().trim()));
            if (query.from() != null)
                where.add(
                        cb.greaterThanOrEqualTo(
                                root.get("createdAt"), query.from().atStartOfDay()));
            if (query.to() != null)
                where.add(
                        cb.lessThan(root.get("createdAt"), query.to().plusDays(1).atStartOfDay()));
            return cb.and(where.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}
