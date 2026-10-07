package com.uav.platform.modules.audit.specification;


import com.uav.platform.modules.audit.common.*;

import com.uav.platform.modules.audit.common.AuditAction;
import com.uav.platform.modules.audit.entity.AuditLog;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.Locale;

/**
 * Atomic Specification factories for querying {@link AuditLog} entities.
 * <p>
 * Follows DDD and Clean Architecture by decoupling query predicate construction
 * from data access repositories. All methods are null-safe and return {@code null}
 * when arguments are empty/null so Spring Data JPA's {@code .and()} drops them automatically.
 */
public final class AuditLogSpecifications {

    private AuditLogSpecifications() {
        // Enforce non-instantiability
    }

    /**
     * Case-insensitive keyword search matching actorUsername, entityType, entityId, or details.
     */
    public static Specification<AuditLog> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(cb.coalesce(root.get("actorUsername"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("entityType"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("entityId"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("details"), "")), pattern)
            );
        };
    }

    /**
     * Filters audit logs by actor username (case-insensitive).
     */
    public static Specification<AuditLog> hasActor(String actorUsername) {
        return (root, query, cb) -> {
            if (actorUsername == null || actorUsername.isBlank()) {
                return null;
            }
            return cb.equal(cb.lower(root.get("actorUsername")), actorUsername.trim().toLowerCase(Locale.ROOT));
        };
    }

    /**
     * Filters audit logs by actor user ID.
     */
    public static Specification<AuditLog> hasActorUserId(Long actorUserId) {
        return (root, query, cb) -> actorUserId == null ? null : cb.equal(root.get("actorUserId"), actorUserId);
    }

    /**
     * Filters audit logs by audit action enum.
     */
    public static Specification<AuditLog> hasAction(AuditAction action) {
        return (root, query, cb) -> action == null ? null : cb.equal(root.get("action"), action);
    }

    /**
     * Filters audit logs by affected target entity type (e.g. UAV, MISSION, USER).
     */
    public static Specification<AuditLog> hasEntityType(String entityType) {
        return (root, query, cb) -> {
            if (entityType == null || entityType.isBlank()) {
                return null;
            }
            return cb.equal(cb.lower(root.get("entityType")), entityType.trim().toLowerCase(Locale.ROOT));
        };
    }

    /**
     * Filters audit logs by target entity ID.
     */
    public static Specification<AuditLog> hasEntityId(String entityId) {
        return (root, query, cb) -> {
            if (entityId == null || entityId.isBlank()) {
                return null;
            }
            return cb.equal(root.get("entityId"), entityId.trim());
        };
    }

    /**
     * Filters audit logs created within a specific timestamp window [from, to].
     */
    public static Specification<AuditLog> createdBetween(LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> {
            if (from == null && to == null) {
                return null;
            }
            if (from != null && to != null) {
                return cb.and(
                        cb.greaterThanOrEqualTo(root.get("createdAt"), from),
                        cb.lessThanOrEqualTo(root.get("createdAt"), to)
                );
            }
            return from != null
                    ? cb.greaterThanOrEqualTo(root.get("createdAt"), from)
                    : cb.lessThanOrEqualTo(root.get("createdAt"), to);
        };
    }

    /**
     * Composable composite filter for common audit log search scenarios.
     */
    public static Specification<AuditLog> filter(String actorUsername, AuditAction action,
                                                 String entityType, String entityId,
                                                 LocalDateTime from, LocalDateTime to) {
        return Specification.where(hasActor(actorUsername))
                .and(hasAction(action))
                .and(hasEntityType(entityType))
                .and(hasEntityId(entityId))
                .and(createdBetween(from, to));
    }
}
