package com.uav.platform.modules.audit.entity;


import com.uav.platform.modules.audit.common.*;

import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "audit_logs")
public class AuditLog extends BaseEntity {
    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "actor_username", length = 100)
    private String actorUsername;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AuditAction action;

    @Column(name = "entity_type", nullable = false, length = 80)
    private String entityType;

    @Column(name = "entity_id", length = 80)
    private String entityId;

    @Column(length = 2000)
    private String details;

    protected AuditLog() {}

    public AuditLog(Long actorUserId, String actorUsername, AuditAction action,
                    String entityType, String entityId, String details) {
        this.actorUserId = actorUserId;
        this.actorUsername = actorUsername;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.details = details;
    }

    public Long getActorUserId() { return actorUserId; }
    public String getActorUsername() { return actorUsername; }
    public AuditAction getAction() { return action; }
    public String getEntityType() { return entityType; }
    public String getEntityId() { return entityId; }
    public String getDetails() { return details; }
}
