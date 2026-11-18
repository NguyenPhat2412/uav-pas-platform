package com.uav.platform.repository.project;

import com.uav.platform.entity.project.ProjectSubscription;
import com.uav.platform.enums.project.ProjectSubscriptionStatus;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface ProjectSubscriptionRepository
        extends JpaRepository<ProjectSubscription, Long>,
                JpaSpecificationExecutor<ProjectSubscription> {

    @EntityGraph(attributePaths = {"project", "listing"})
    Optional<ProjectSubscription> findByIdAndProjectIdAndDeletedFalse(Long id, Long projectId);

    List<ProjectSubscription> findByProjectIdAndDeletedFalse(Long projectId);

    long countByProjectIdAndDeletedFalseAndStatus(Long projectId, ProjectSubscriptionStatus status);
}
