package com.uav.platform.specification;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.AiDetection;
import com.uav.platform.entity.AiTask;
import com.uav.platform.entity.SarMission;
import com.uav.platform.enums.SarStatus;

public final class SarSpecifications {

    private SarSpecifications() {}

    public static HibernateSpecification<SarMission> hasMissionId(Long missionId) {
        return (root, query, cb) ->
                missionId == null ? null : cb.equal(root.get("mission").get("id"), missionId);
    }

    /** SAR missions where the user is the assigned operator or the requesting customer. */
    public static HibernateSpecification<SarMission> visibleTo(String username) {
        return (root, query, cb) -> {
            var mission = root.join("mission");
            var operator = mission.join("operator", jakarta.persistence.criteria.JoinType.LEFT);
            var customer = mission.join("customer", jakarta.persistence.criteria.JoinType.LEFT);
            return cb.or(
                    cb.equal(operator.get("username"), username),
                    cb.equal(customer.get("username"), username));
        };
    }

    public static HibernateSpecification<SarMission> notSarStatus(SarStatus status) {
        return (root, query, cb) ->
                status == null ? null : cb.notEqual(root.get("sarStatus"), status);
    }

    public static HibernateSpecification<SarMission> hasSarStatus(SarStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("sarStatus"), status);
    }

    public static HibernateSpecification<AiTask> taskForMission(Long missionId) {
        return (root, query, cb) ->
                missionId == null ? null : cb.equal(root.get("mission").get("id"), missionId);
    }

    public static HibernateSpecification<AiDetection> detectionForMission(Long missionId) {
        return (root, query, cb) ->
                missionId == null ? null : cb.equal(root.get("mission").get("id"), missionId);
    }

    public static HibernateSpecification<AiDetection> hasMinimumConfidence(Double minConfidence) {
        return (root, query, cb) ->
                minConfidence == null
                        ? null
                        : cb.greaterThanOrEqualTo(root.get("confidence"), minConfidence);
    }
}
