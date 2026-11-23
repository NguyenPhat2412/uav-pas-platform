package com.uav.platform.dao.impl.maintenance;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.maintenance.IRepairOrderDao;
import com.uav.platform.entity.maintenance.RepairOrder;
import com.uav.platform.enums.maintenance.RepairStatus;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public class RepairOrderDaoImpl extends HibernateGenericDao<Long, RepairOrder>
        implements IRepairOrderDao {

    private static final Logger logger = LoggerFactory.getLogger(RepairOrderDaoImpl.class);

    public RepairOrderDaoImpl(final EntityManager entityManager) {
        super(RepairOrder.class, entityManager);
    }

    @Override
    public List<RepairOrder> findAllWithUav() {
        return withEntityGraph(hql("select o from RepairOrder o", RepairOrder.class), "uav")
                .getResultList();
    }

    @Override
    public Optional<Long> findUavId(Long id) {
        return hql("select o.uav.id from RepairOrder o where o.id = :id", Long.class)
                .setParameter("id", id)
                .uniqueResultOptional();
    }

    @Override
    public Optional<RepairOrder> findForUpdate(Long id) {
        return hql("select o from RepairOrder o where o.id = :id", RepairOrder.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public boolean existsByUavIdAndStatusIn(Long uavId, Collection<RepairStatus> statuses) {
        if (isEmpty(statuses)) return false;
        return !hql(
                        "select 1 from RepairOrder e where e.uav.id = :uavId and e.status in :statuses",
                        Integer.class)
                .setParameter("uavId", uavId)
                .setParameter("statuses", statuses)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public Set<Long> findUavIdsWithStatusIn(Collection<RepairStatus> statuses) {
        if (isEmpty(statuses)) return java.util.Set.of();
        return new java.util.LinkedHashSet<>(
                hql(
                                "select distinct o.uav.id from RepairOrder o where o.status in :statuses",
                                Long.class)
                        .setParameter("statuses", statuses)
                        .getResultList());
    }

    @Override
    public boolean existsByUavIdAndStatus(Long uavId, RepairStatus status) {
        return !hql(
                        "select 1 from RepairOrder e where e.uav.id = :uavId and e.status = :status",
                        Integer.class)
                .setParameter("uavId", uavId)
                .setParameter("status", status)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public boolean existsByScheduleIdAndStatusIn(
            Long scheduleId, Collection<RepairStatus> statuses) {
        if (isEmpty(statuses)) return false;
        return !hql(
                        "select 1 from RepairOrder e where e.schedule.id = :scheduleId and e.status in :statuses",
                        Integer.class)
                .setParameter("scheduleId", scheduleId)
                .setParameter("statuses", statuses)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }
}
