package com.uav.platform.specification.project;

import com.uav.platform.entity.project.ProjectSubscription;
import com.uav.platform.enums.project.ProjectSubscriptionStatus;

import org.springframework.data.jpa.domain.Specification;

public final class ProjectSubscriptionSpecifications {

    private ProjectSubscriptionSpecifications() {}

    public static Specification<ProjectSubscription> notDeleted() {
        return (root, query, cb) -> cb.isFalse(root.get("deleted"));
    }

    public static Specification<ProjectSubscription> belongsToProject(Long projectId) {
        return (root, query, cb) ->
                projectId == null ? null : cb.equal(root.get("project").get("id"), projectId);
    }

    public static Specification<ProjectSubscription> hasStatus(ProjectSubscriptionStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }
}
