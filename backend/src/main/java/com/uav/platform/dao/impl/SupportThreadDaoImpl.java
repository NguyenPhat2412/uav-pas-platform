package com.uav.platform.dao.impl;

import com.uav.platform.dao.ISupportThreadDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.SupportThread;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class SupportThreadDaoImpl extends HibernateGenericDao<Long, SupportThread>
        implements ISupportThreadDao {

    private static final Logger logger = LoggerFactory.getLogger(SupportThreadDaoImpl.class);

    public SupportThreadDaoImpl(final EntityManager entityManager) {
        super(SupportThread.class, entityManager);
    }

    @Override
    public Optional<SupportThread> findByVisitorToken(String visitorToken) {
        return hql("select e from SupportThread e where e.visitorToken = :visitorToken")
                .setParameter("visitorToken", visitorToken)
                .uniqueResultOptional();
    }

    @Override
    public boolean existsByCode(String code) {
        return !hql("select 1 from SupportThread e where e.code = :code", Integer.class)
                .setParameter("code", code)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public boolean existsByVisitorToken(String visitorToken) {
        return !hql(
                        "select 1 from SupportThread e where e.visitorToken = :visitorToken",
                        Integer.class)
                .setParameter("visitorToken", visitorToken)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public long countByStatus(String status) {
        Long v =
                hql("select count(e) from SupportThread e where e.status = :status", Long.class)
                        .setParameter("status", status)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public long countByUnreadForAdminGreaterThan(int threshold) {
        Long v =
                hql(
                                "select count(e) from SupportThread e where e.unreadForAdmin > :threshold",
                                Long.class)
                        .setParameter("threshold", threshold)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public long sumUnreadForAdmin() {
        Long v =
                hql("select coalesce(sum(t.unreadForAdmin), 0) from SupportThread t", Long.class)
                        .getSingleResult();
        return v == null ? 0L : v;
    }
}
