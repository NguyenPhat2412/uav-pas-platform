package com.uav.platform.dao.impl;

import com.uav.platform.dao.IFinancialOutboxDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.FinancialOutboxEvent;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.hibernate.query.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.List;
import java.util.Optional;

@Repository
public class FinancialOutboxDaoImpl extends HibernateGenericDao<String, FinancialOutboxEvent>
        implements IFinancialOutboxDao {

    private static final Logger logger = LoggerFactory.getLogger(FinancialOutboxDaoImpl.class);

    public FinancialOutboxDaoImpl(final EntityManager entityManager) {
        super(FinancialOutboxEvent.class, entityManager);
    }

    @Override
    public Optional<FinancialOutboxEvent> findByIdForUpdate(String id) {
        return hql(
                        "select e from FinancialOutboxEvent e where e.id=:id",
                        FinancialOutboxEvent.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public List<String> dueIds(LocalDateTime now, Pageable pageable) {
        Query<String> q =
                hql(
                                "select e.id from FinancialOutboxEvent e where e.status in ('PENDING','WAITING_SUBSCRIBERS') and e.nextAttemptAt<=:now order by e.nextAttemptAt,e.id",
                                String.class)
                        .setParameter("now", now);
        if (pageable != null && pageable.isPaged()) {
            q.setFirstResult((int) pageable.getOffset());
            q.setMaxResults(pageable.getPageSize());
        }
        return q.getResultList();
    }
}
