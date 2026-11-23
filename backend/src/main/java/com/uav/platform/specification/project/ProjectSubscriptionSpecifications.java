package com.uav.platform.specification.project;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.project.ProjectSubscription;
import com.uav.platform.enums.project.ProjectSubscriptionStatus;

public final class ProjectSubscriptionSpecifications {

    private ProjectSubscriptionSpecifications() {}

    public static HibernateSpecification<ProjectSubscription> notDeleted() {
        return (root, query, cb) -> cb.isFalse(root.get("deleted"));
    }

    public static HibernateSpecification<ProjectSubscription> belongsToProject(Long projectId) {
        return (root, query, cb) ->
                projectId == null ? null : cb.equal(root.get("project").get("id"), projectId);
    }

    public static HibernateSpecification<ProjectSubscription> hasStatus(
            ProjectSubscriptionStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }
}
