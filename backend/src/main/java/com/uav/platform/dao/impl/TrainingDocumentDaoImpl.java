package com.uav.platform.dao.impl;

import com.uav.platform.dao.ITrainingDocumentDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.TrainingDocument;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class TrainingDocumentDaoImpl extends HibernateGenericDao<Long, TrainingDocument>
        implements ITrainingDocumentDao {

    private static final Logger logger = LoggerFactory.getLogger(TrainingDocumentDaoImpl.class);

    public TrainingDocumentDaoImpl(final EntityManager entityManager) {
        super(TrainingDocument.class, entityManager);
    }

    @Override
    public List<TrainingDocument> findByTargetPortalAndActiveTrueOrderBySortOrderAscIdAsc(
            String targetPortal) {
        return hql("select e from TrainingDocument e where e.targetPortal = :targetPortal and e.active = true order by e.sortOrder asc, e.id asc")
                .setParameter("targetPortal", targetPortal)
                .getResultList();
    }

    @Override
    public List<TrainingDocument> findByTargetPortalOrderBySortOrderAscIdAsc(String targetPortal) {
        return hql("select e from TrainingDocument e where e.targetPortal = :targetPortal order by e.sortOrder asc, e.id asc")
                .setParameter("targetPortal", targetPortal)
                .getResultList();
    }

    @Override
    public List<TrainingDocument> findByActiveTrueOrderByTargetPortalAscSortOrderAscIdAsc() {
        return hql("select e from TrainingDocument e where e.active = true order by e.targetPortal asc, e.sortOrder asc, e.id asc")
                .getResultList();
    }

    @Override
    public Optional<TrainingDocument> findByCodeIgnoreCase(String code) {
        return hql("select e from TrainingDocument e where lower(e.code) = lower(:code)")
                .setParameter("code", code)
                .uniqueResultOptional();
    }

    @Override
    public Optional<TrainingDocument> findBySlugIgnoreCase(String slug) {
        return hql("select e from TrainingDocument e where lower(e.slug) = lower(:slug)")
                .setParameter("slug", slug)
                .uniqueResultOptional();
    }

    @Override
    public Optional<TrainingDocument> findByCodeIgnoreCaseOrSlugIgnoreCase(
            String code, String slug) {
        return hql("select e from TrainingDocument e where lower(e.code) = lower(:code) or lower(e.slug) = lower(:slug)")
                .setParameter("code", code)
                .setParameter("slug", slug)
                .uniqueResultOptional();
    }

    @Override
    public boolean existsByCodeIgnoreCase(String code) {
        return !hql(
                        "select 1 from TrainingDocument e where lower(e.code) = lower(:code)",
                        Integer.class)
                .setParameter("code", code)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public boolean existsBySlugIgnoreCase(String slug) {
        return !hql(
                        "select 1 from TrainingDocument e where lower(e.slug) = lower(:slug)",
                        Integer.class)
                .setParameter("slug", slug)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }
}
