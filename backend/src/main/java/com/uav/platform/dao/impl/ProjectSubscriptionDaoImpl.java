package com.uav.platform.dao.impl;

import com.uav.platform.dao.IProjectSubscriptionDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.ProjectSubscription;
import com.uav.platform.enums.ProjectSubscriptionStatus;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class ProjectSubscriptionDaoImpl extends HibernateGenericDao<Long, ProjectSubscription>
        implements IProjectSubscriptionDao {

    private static final Logger logger = LoggerFactory.getLogger(ProjectSubscriptionDaoImpl.class);

    public ProjectSubscriptionDaoImpl(final EntityManager entityManager) {
        super(ProjectSubscription.class, entityManager);
    }

    @Override
    public Optional<ProjectSubscription> findByIdAndProjectIdAndDeletedFalse(
            Long id, Long projectId) {
        return withEntityGraph(
                        hql("select e from ProjectSubscription e where e.id = :id and e.project.id = :projectId and e.deleted = false")
                                .setParameter("id", id)
                                .setParameter("projectId", projectId),
                        "project",
                        "listing")
                .uniqueResultOptional();
    }

    @Override
    public List<ProjectSubscription> findByProjectIdAndDeletedFalse(Long projectId) {
        return hql("select e from ProjectSubscription e where e.project.id = :projectId and e.deleted = false")
                .setParameter("projectId", projectId)
                .getResultList();
    }

    @Override
    public long countByProjectIdAndDeletedFalseAndStatus(
            Long projectId, ProjectSubscriptionStatus status) {
        Long v =
                hql(
                                "select count(e) from ProjectSubscription e where e.project.id = :projectId and e.deleted = false and e.status = :status",
                                Long.class)
                        .setParameter("projectId", projectId)
                        .setParameter("status", status)
                        .getSingleResult();
        return v == null ? 0L : v;
    }
}
