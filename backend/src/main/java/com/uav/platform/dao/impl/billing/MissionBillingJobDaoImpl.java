package com.uav.platform.dao.impl.billing;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.billing.IMissionBillingJobDao;
import com.uav.platform.entity.billing.MissionBillingJob;

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
public class MissionBillingJobDaoImpl extends HibernateGenericDao<Long, MissionBillingJob>
        implements IMissionBillingJobDao {

    private static final Logger logger = LoggerFactory.getLogger(MissionBillingJobDaoImpl.class);

    public MissionBillingJobDaoImpl(final EntityManager entityManager) {
        super(MissionBillingJob.class, entityManager);
    }

    @Override
    public Optional<MissionBillingJob> findByMissionId(Long missionId) {
        return hql("select e from MissionBillingJob e where e.mission.id = :missionId")
                .setParameter("missionId", missionId)
                .uniqueResultOptional();
    }

    @Override
    public Optional<Long> missionIdForJob(Long id) {
        return hql("select j.mission.id from MissionBillingJob j where j.id=:id", Long.class)
                .setParameter("id", id)
                .uniqueResultOptional();
    }

    @Override
    public Optional<MissionBillingJob> findByIdForUpdate(Long id) {
        return hql("select j from MissionBillingJob j where j.id=:id", MissionBillingJob.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public List<Long> dueIds(LocalDateTime now, Pageable pageable) {
        Query<Long> q =
                hql(
                                "select j.id from MissionBillingJob j where j.status not in ('ISSUED','FAILED') and j.nextAttemptAt<=:now order by j.nextAttemptAt, j.id",
                                Long.class)
                        .setParameter("now", now);
        if (pageable != null && pageable.isPaged()) {
            q.setFirstResult((int) pageable.getOffset());
            q.setMaxResults(pageable.getPageSize());
        }
        return q.getResultList();
    }
}
