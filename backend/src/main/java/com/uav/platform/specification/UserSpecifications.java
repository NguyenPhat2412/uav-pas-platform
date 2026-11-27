package com.uav.platform.specification;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.AppUser;
import com.uav.platform.enums.UserRole;
import com.uav.platform.enums.UserStatus;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Locale;

/**
 * HibernateSpecification Factory for AppUser entity according to Clean Architecture and DDD.
 * All factory methods return null on null/blank inputs to allow seamless composition via .and().
 */
public final class UserSpecifications {

    private UserSpecifications() {}

    /**
     * Case-insensitive keyword search across username, email, and fullName.
     */
    public static HibernateSpecification<AppUser> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("username")), pattern),
                    cb.like(cb.lower(root.get("email")), pattern),
                    cb.and(
                            cb.isNotNull(root.get("fullName")),
                            cb.like(cb.lower(root.get("fullName")), pattern)));
        };
    }

    /**
     * Exact match on UserRole.
     */
    public static HibernateSpecification<AppUser> hasRole(UserRole role) {
        return (root, query, cb) -> role == null ? null : cb.equal(root.get("role"), role);
    }

    /**
     * Match on the status an administrator sees. A manually locked account counts as SUSPENDED
     * whatever its stored status, so it is never listed as ACTIVE or INACTIVE.
     */
    public static HibernateSpecification<AppUser> hasStatus(UserStatus status) {
        return (root, query, cb) -> {
            if (status == null) return null;
            var locked = cb.isTrue(root.get("manualLocked"));
            if (status == UserStatus.SUSPENDED)
                return cb.or(cb.equal(root.get("status"), status), locked);
            return cb.and(cb.equal(root.get("status"), status), cb.not(locked));
        };
    }

    /**
     * Range match on createdAt timestamp.
     */
    public static HibernateSpecification<AppUser> createdBetween(
            LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> {
            if (from == null && to == null) return null;
            if (from != null && to != null) {
                return cb.and(
                        cb.greaterThanOrEqualTo(root.get("createdAt"), from),
                        cb.lessThan(root.get("createdAt"), to));
            }
            return from != null
                    ? cb.greaterThanOrEqualTo(root.get("createdAt"), from)
                    : cb.lessThan(root.get("createdAt"), to);
        };
    }

    /**
     * Filter by permitted user IDs (data scoping / authorization).
     */
    public static HibernateSpecification<AppUser> idIn(Collection<Long> ids) {
        return (root, query, cb) -> {
            if (ids == null || ids.isEmpty()) {
                return cb.disjunction();
            }
            return root.get("id").in(ids);
        };
    }

    /**
     * Convenience composite specification for user search and role filtering.
     */
    public static HibernateSpecification<AppUser> filter(String keyword, UserRole role) {
        return HibernateSpecification.where(hasKeyword(keyword)).and(hasRole(role));
    }
}
