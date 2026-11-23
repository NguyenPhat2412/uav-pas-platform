package com.uav.platform.dao.project;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.project.ProjectSubscription;
import com.uav.platform.enums.project.ProjectSubscriptionStatus;

import java.util.List;
import java.util.Optional;

public interface IProjectSubscriptionDao extends IGenericDao<Long, ProjectSubscription> {
    Optional<ProjectSubscription> findByIdAndProjectIdAndDeletedFalse(Long id, Long projectId);

    List<ProjectSubscription> findByProjectIdAndDeletedFalse(Long projectId);

    long countByProjectIdAndDeletedFalseAndStatus(Long projectId, ProjectSubscriptionStatus status);
}
