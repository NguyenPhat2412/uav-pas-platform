package com.uav.platform.specification;

import com.uav.platform.common.util.OrderStatusGroups;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dto.record.MissionFilter;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionReview;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.MissionType;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Subquery;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Locale;

/**
 * HibernateSpecification Factory for Mission entity according to Clean Architecture and DDD. Provides
 * atomic, composable specifications with null-safe semantics.
 */
public final class MissionSpecifications {

    private MissionSpecifications() {}

    public static HibernateSpecification<Mission> hasKeyword(String keyword) {
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
                    cb.like(cb.lower(customer.get("username")), pattern));
        };
    }

    public static HibernateSpecification<Mission> hasStatus(MissionStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static HibernateSpecification<Mission> hasStatusIn(Collection<MissionStatus> statuses) {
        return (root, query, cb) ->
                (statuses == null || statuses.isEmpty()) ? null : root.get("status").in(statuses);
    }

    public static HibernateSpecification<Mission> hasMissionType(MissionType missionType) {
        return (root, query, cb) ->
                missionType == null ? null : cb.equal(root.get("missionType"), missionType);
    }

    public static HibernateSpecification<Mission> belongsToStation(Long stationId) {
        return (root, query, cb) ->
                stationId == null ? null : cb.equal(root.get("station").get("id"), stationId);
    }

    public static HibernateSpecification<Mission> belongsToProject(Long projectId) {
        return (root, query, cb) ->
                projectId == null ? null : cb.equal(root.get("project").get("id"), projectId);
    }

    public static HibernateSpecification<Mission> belongsToProvider(Long providerId) {
        return (root, query, cb) ->
                providerId == null ? null : cb.equal(root.get("provider").get("id"), providerId);
    }

    public static HibernateSpecification<Mission> hasStatusGroup(String rawGroup) {
        String group = OrderStatusGroups.normalizeGroupParam(rawGroup);
        if (group == null) {
            return (root, query, cb) -> null;
        }
        return (root, query, cb) ->
                switch (group) {
                    case OrderStatusGroups.PENDING ->
                            root.get("status").in(OrderStatusGroups.PENDING_STATUSES);
                    case OrderStatusGroups.SCHEDULED ->
                            root.get("status").in(OrderStatusGroups.SCHEDULED_STATUSES);
                    case OrderStatusGroups.IN_FLIGHT ->
                            cb.equal(root.get("status"), MissionStatus.IN_PROGRESS);
                    case OrderStatusGroups.DELIVERED ->
                            cb.equal(root.get("status"), MissionStatus.COMPLETED);
                    case OrderStatusGroups.TO_REVIEW -> {
                        Subquery<Long> sq = query.subquery(Long.class);
                        var reviewRoot = sq.from(MissionReview.class);
                        sq.select(reviewRoot.get("id"))
                                .where(cb.equal(reviewRoot.get("mission"), root));
                        yield cb.and(
                                cb.equal(root.get("status"), MissionStatus.COMPLETED),
                                cb.not(cb.exists(sq)));
                    }
                    case "REVIEWED" -> {
                        Subquery<Long> sq = query.subquery(Long.class);
                        var reviewRoot = sq.from(MissionReview.class);
                        sq.select(reviewRoot.get("id"))
                                .where(cb.equal(reviewRoot.get("mission"), root));
                        yield cb.and(
                                cb.equal(root.get("status"), MissionStatus.COMPLETED),
                                cb.exists(sq));
                    }
                    case OrderStatusGroups.CANCELLED ->
                            root.get("status").in(OrderStatusGroups.CANCELLED_STATUSES);
                    default -> null;
                };
    }

    public static HibernateSpecification<Mission> hasOperator(Long operatorId) {
        return (root, query, cb) ->
                operatorId == null ? null : cb.equal(root.get("operator").get("id"), operatorId);
    }

    public static HibernateSpecification<Mission> hasCustomer(Long customerId) {
        return (root, query, cb) ->
                customerId == null ? null : cb.equal(root.get("customer").get("id"), customerId);
    }

    public static HibernateSpecification<Mission> requestedOn(LocalDate date) {
        return (root, query, cb) -> date == null ? null : cb.equal(root.get("requestedDate"), date);
    }

    public static HibernateSpecification<Mission> overlappingUav(
            Long uavId,
            Collection<MissionStatus> excluded,
            LocalDateTime start,
            LocalDateTime end) {
        return (root, query, cb) -> {
            if (uavId == null || start == null || end == null) return cb.disjunction();
            var uavPredicate = cb.equal(root.get("uav").get("id"), uavId);
            var timePredicate =
                    cb.and(
                            cb.lessThan(root.get("startTime"), end),
                            cb.greaterThan(root.get("expectedEndTime"), start));
            if (excluded != null && !excluded.isEmpty()) {
                return cb.and(uavPredicate, cb.not(root.get("status").in(excluded)), timePredicate);
            }
            return cb.and(uavPredicate, timePredicate);
        };
    }

    public static HibernateSpecification<Mission> overlappingOperator(
            Long operatorId,
            Collection<MissionStatus> excluded,
            LocalDateTime start,
            LocalDateTime end) {
        return (root, query, cb) -> {
            if (operatorId == null || start == null || end == null) return cb.disjunction();
            var opPredicate = cb.equal(root.get("operator").get("id"), operatorId);
            var timePredicate =
                    cb.and(
                            cb.lessThan(root.get("startTime"), end),
                            cb.greaterThan(root.get("expectedEndTime"), start));
            if (excluded != null && !excluded.isEmpty()) {
                return cb.and(opPredicate, cb.not(root.get("status").in(excluded)), timePredicate);
            }
            return cb.and(opPredicate, timePredicate);
        };
    }

    public static HibernateSpecification<Mission> filtered(MissionFilter filter, Long ownerId) {
        if (filter == null && ownerId == null) {
            return (root, query, cb) -> null;
        }
        MissionFilter f = filter == null ? MissionFilter.empty() : filter;
        Long effectiveCustomerId = ownerId != null ? ownerId : f.customerId();
        return HibernateSpecification.where(hasCustomer(effectiveCustomerId))
                .and(hasStatus(f.status()))
                .and(hasMissionType(f.missionType()))
                .and(belongsToStation(f.stationId()))
                .and(belongsToProject(f.projectId()))
                .and(belongsToProvider(ownerId != null ? null : f.providerId()))
                .and(hasStatusGroup(f.statusGroup()))
                .and(hasOperator(f.operatorId()))
                .and(requestedOn(f.requestedDate()))
                .and(hasKeyword(f.search()));
    }
}
