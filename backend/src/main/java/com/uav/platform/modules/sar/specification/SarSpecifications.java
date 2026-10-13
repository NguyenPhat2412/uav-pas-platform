package com.uav.platform.modules.sar.specification;

import com.uav.platform.modules.sar.common.SarStatus;
import com.uav.platform.modules.sar.entity.AiDetection;
import com.uav.platform.modules.sar.entity.AiTask;
import com.uav.platform.modules.sar.entity.SarMission;
import org.springframework.data.jpa.domain.Specification;

public final class SarSpecifications {

    private SarSpecifications() {}

    public static Specification<SarMission> hasMissionId(Long missionId) {
        return (root, query, cb) -> missionId == null ? null : cb.equal(root.get("mission").get("id"), missionId);
    }

    public static Specification<SarMission> hasSarStatus(SarStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("sarStatus"), status);
    }

    public static Specification<AiTask> taskForMission(Long missionId) {
        return (root, query, cb) -> missionId == null ? null : cb.equal(root.get("mission").get("id"), missionId);
    }

    public static Specification<AiDetection> detectionForMission(Long missionId) {
        return (root, query, cb) -> missionId == null ? null : cb.equal(root.get("mission").get("id"), missionId);
    }

    public static Specification<AiDetection> hasMinimumConfidence(Double minConfidence) {
        return (root, query, cb) -> minConfidence == null ? null : cb.greaterThanOrEqualTo(root.get("confidence"), minConfidence);
    }
}
