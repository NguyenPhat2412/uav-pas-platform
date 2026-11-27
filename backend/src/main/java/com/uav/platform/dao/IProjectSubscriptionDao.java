package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.ProjectSubscription;
import com.uav.platform.enums.ProjectSubscriptionStatus;

import java.util.List;
import java.util.Optional;

public interface IProjectSubscriptionDao extends IGenericDao<Long, ProjectSubscription> {
    Optional<ProjectSubscription> findByIdAndProjectIdAndDeletedFalse(Long id, Long projectId);

    List<ProjectSubscription> findByProjectIdAndDeletedFalse(Long projectId);

    long countByProjectIdAndDeletedFalseAndStatus(Long projectId, ProjectSubscriptionStatus status);
}
