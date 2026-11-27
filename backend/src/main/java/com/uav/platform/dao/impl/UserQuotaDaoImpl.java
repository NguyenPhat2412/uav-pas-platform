package com.uav.platform.dao.impl;

import com.uav.platform.dao.IUserQuotaDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.UserQuota;

import jakarta.persistence.EntityManager;

import org.hibernate.query.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public class UserQuotaDaoImpl extends HibernateGenericDao<Long, UserQuota>
        implements IUserQuotaDao {

    private static final Logger logger = LoggerFactory.getLogger(UserQuotaDaoImpl.class);

    public UserQuotaDaoImpl(final EntityManager entityManager) {
        super(UserQuota.class, entityManager);
    }

    @Override
    public Optional<UserQuota> findByUserId(Long userId) {
        return hql("select e from UserQuota e where e.user.id = :userId")
                .setParameter("userId", userId)
                .uniqueResultOptional();
    }

    @Override
    @Transactional
    public void deleteByUserId(Long userId) {
        hqlMutation("delete from UserQuota e where e.user.id = :userId")
                .setParameter("userId", userId)
                .executeUpdate();
    }

    @Override
    public java.util.List<Long> dueForRollover(
            java.time.LocalDateTime now, org.springframework.data.domain.Pageable pageable) {
        Query<Long> q =
                hql(
                                "select q.user.id from UserQuota q where q.cycleEnd is null or q.cycleEnd <= :now"
                                        + " or (q.planPaidUntil is not null and q.planPaidUntil <= :now) order by q.id",
                                Long.class)
                        .setParameter("now", now);
        if (pageable != null && pageable.isPaged()) {
            q.setFirstResult((int) pageable.getOffset());
            q.setMaxResults(pageable.getPageSize());
        }
        return q.getResultList();
    }

    @Override
    public java.util.List<Object[]> usageByPlan(
            java.time.LocalDateTime now, java.time.LocalDateTime soon) {
        return hql(
                        "select p.id, count(q),"
                                + " sum(case when p.price > 0 and q.planPaidUntil >= :now then 1 else 0 end),"
                                + " avg(case when q.flightHoursLimit > 0"
                                + " then q.flightHoursUsed * 100.0 / q.flightHoursLimit end),"
                                + " sum(case when q.flightHoursLimit > 0"
                                + " and q.flightHoursUsed >= q.flightHoursLimit * 0.8 then 1 else 0 end),"
                                + " sum(case when q.planPaidUntil >= :now and q.planPaidUntil <= :soon"
                                + " then 1 else 0 end)"
                                + " from UserQuota q join q.plan p group by p.id",
                        Object[].class)
                .setParameter("now", now)
                .setParameter("soon", soon)
                .getResultList();
    }

    @Override
    public java.util.List<Object[]> nearLimit(org.springframework.data.domain.Pageable pageable) {
        Query<Object[]> q =
                hql(
                        "select u.id, u.username, u.fullName, p.code, q.flightHoursUsed, q.flightHoursLimit"
                                + " from UserQuota q join q.user u join q.plan p"
                                + " where q.flightHoursLimit > 0 and q.flightHoursUsed >= q.flightHoursLimit * 0.8"
                                + " order by q.flightHoursUsed / q.flightHoursLimit desc, u.id",
                        Object[].class);
        if (pageable != null && pageable.isPaged()) {
            q.setFirstResult((int) pageable.getOffset());
            q.setMaxResults(pageable.getPageSize());
        }
        return q.getResultList();
    }
}
