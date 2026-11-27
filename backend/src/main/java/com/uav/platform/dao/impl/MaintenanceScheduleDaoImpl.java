package com.uav.platform.dao.impl;

import com.uav.platform.dao.IMaintenanceScheduleDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.MaintenanceSchedule;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class MaintenanceScheduleDaoImpl extends HibernateGenericDao<Long, MaintenanceSchedule>
        implements IMaintenanceScheduleDao {

    private static final Logger logger = LoggerFactory.getLogger(MaintenanceScheduleDaoImpl.class);

    public MaintenanceScheduleDaoImpl(final EntityManager entityManager) {
        super(MaintenanceSchedule.class, entityManager);
    }

    @Override
    public Optional<Long> findUavId(Long id) {
        return hql("select s.uav.id from MaintenanceSchedule s where s.id = :id", Long.class)
                .setParameter("id", id)
                .uniqueResultOptional();
    }

    @Override
    public Optional<MaintenanceSchedule> findForUpdate(Long id) {
        return hql(
                        "select s from MaintenanceSchedule s where s.id = :id",
                        MaintenanceSchedule.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }
}
