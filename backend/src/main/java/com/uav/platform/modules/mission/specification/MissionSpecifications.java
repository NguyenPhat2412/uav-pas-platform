package com.uav.platform.modules.mission.specification;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.config.request.MissionFilter;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.common.MissionStatus;
import com.uav.platform.modules.mission.common.MissionType;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Locale;

/**
 * Specification Factory for Mission entity according to Clean Architecture and DDD.
 * Provides atomic, composable specifications with null-safe semantics.
 */
public final class MissionSpecifications {

    private MissionSpecifications() {}

    /**
     * Case-insensitive keyword search across code, title, customer full name, and username.
     */
    public static Specification<Mission> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            var customer = root.join("customer", JoinType.LEFT);
            return cb.or(
                    cb.like(cb.lower(root.get("code")), pattern),
                    cb.like(cb.lower(root.get("title")), pattern),
                    cb.like(cb.lower(customer.get("fullName")), pattern),
                    cb.like(cb.lower(customer.get("username")), pattern)
            );
        };
    }

    /**
     * Exact match on MissionStatus.
     */
    public static Specification<Mission> hasStatus(MissionStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    /**
     * Filter by a collection of allowed MissionStatuses.
     */
    public static Specification<Mission> hasStatusIn(Collection<MissionStatus> statuses) {
        return (root, query, cb) -> (statuses == null || statuses.isEmpty()) ? null : root.get("status").in(statuses);
    }

    /**
     * Exact match on MissionType.
     */
    public static Specification<Mission> hasMissionType(MissionType missionType) {
        return (root, query, cb) -> missionType == null ? null : cb.equal(root.get("missionType"), missionType);
    }

    /**
     * Filter missions assigned to a specific station ID.
     */
    public static Specification<Mission> belongsToStation(Long stationId) {
        return (root, query, cb) -> stationId == null ? null : cb.equal(root.get("station").get("id"), stationId);
    }

    /**
     * Filter missions assigned to a specific operator ID.
     */
    public static Specification<Mission> hasOperator(Long operatorId) {
        return (root, query, cb) -> operatorId == null ? null : cb.equal(root.get("operator").get("id"), operatorId);
    }

    /**
     * Filter missions requested by a specific customer ID.
     */
    public static Specification<Mission> hasCustomer(Long customerId) {
        return (root, query, cb) -> customerId == null ? null : cb.equal(root.get("customer").get("id"), customerId);
    }

    /**
     * Filter missions requested on a specific calendar date.
     */
    public static Specification<Mission> requestedOn(LocalDate date) {
        return (root, query, cb) -> date == null ? null : cb.equal(root.get("requestedDate"), date);
    }

    /**
     * Filter missions overlapping with a given UAV's scheduled time window,
     * ignoring terminal or canceled statuses (excluded).
     */
    public static Specification<Mission> overlappingUav(Long uavId, Collection<MissionStatus> excluded,
                                                        LocalDateTime start, LocalDateTime end) {
        return (root, query, cb) -> {
            if (uavId == null || start == null || end == null) return cb.disjunction();
            var uavPredicate = cb.equal(root.get("uav").get("id"), uavId);
            var timePredicate = cb.and(
                    cb.lessThan(root.get("startTime"), end),
                    cb.greaterThan(root.get("expectedEndTime"), start)
            );
            if (excluded != null && !excluded.isEmpty()) {
                return cb.and(uavPredicate, cb.not(root.get("status").in(excluded)), timePredicate);
            }
            return cb.and(uavPredicate, timePredicate);
        };
    }

    /**
     * Filter missions overlapping with a given Operator's scheduled time window,
     * ignoring terminal or canceled statuses (excluded).
     */
    public static Specification<Mission> overlappingOperator(Long operatorId, Collection<MissionStatus> excluded,
                                                             LocalDateTime start, LocalDateTime end) {
        return (root, query, cb) -> {
            if (operatorId == null || start == null || end == null) return cb.disjunction();
            var opPredicate = cb.equal(root.get("operator").get("id"), operatorId);
            var timePredicate = cb.and(
                    cb.lessThan(root.get("startTime"), end),
                    cb.greaterThan(root.get("expectedEndTime"), start)
            );
            if (excluded != null && !excluded.isEmpty()) {
                return cb.and(opPredicate, cb.not(root.get("status").in(excluded)), timePredicate);
            }
            return cb.and(opPredicate, timePredicate);
        };
    }

    /**
     * Composite filter method preserving full backward compatibility with MissionFilter.
     */
    public static Specification<Mission> filtered(MissionFilter filter, Long ownerId) {
        if (filter == null && ownerId == null) {
            return null;
        }
        MissionFilter f = filter == null ? MissionFilter.empty() : filter;
        Long effectiveCustomerId = ownerId != null ? ownerId : f.customerId();
        return Specification.where(hasCustomer(effectiveCustomerId))
                .and(hasStatus(f.status()))
                .and(hasMissionType(f.missionType()))
                .and(belongsToStation(f.stationId()))
                .and(hasOperator(f.operatorId()))
                .and(requestedOn(f.requestedDate()))
                .and(hasKeyword(f.search()));
    }
}
