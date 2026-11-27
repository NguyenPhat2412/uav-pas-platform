package com.uav.platform.dao.impl;

import com.uav.platform.dao.IProjectDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.Project;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class ProjectDaoImpl extends HibernateGenericDao<Long, Project> implements IProjectDao {

    private static final Logger logger = LoggerFactory.getLogger(ProjectDaoImpl.class);

    public ProjectDaoImpl(final EntityManager entityManager) {
        super(Project.class, entityManager);
    }

    @Override
    public Optional<Project> findByIdAndDeletedFalse(Long id) {
        return hql("select e from Project e where e.id = :id and e.deleted = false")
                .setParameter("id", id)
                .uniqueResultOptional();
    }

    @Override
    public boolean existsByCode(String code) {
        return !hql("select 1 from Project e where e.code = :code", Integer.class)
                .setParameter("code", code)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }
}
