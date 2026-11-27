package com.uav.platform.dao.impl;

import com.uav.platform.dao.IMissionPreflightLogDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.MissionPreflightLog;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public class MissionPreflightLogDaoImpl extends HibernateGenericDao<Long, MissionPreflightLog>
        implements IMissionPreflightLogDao {

    private static final Logger logger = LoggerFactory.getLogger(MissionPreflightLogDaoImpl.class);

    public MissionPreflightLogDaoImpl(final EntityManager entityManager) {
        super(MissionPreflightLog.class, entityManager);
    }

    @Override
    public Optional<MissionPreflightLog> findByMissionId(Long missionId) {
        return hql("select e from MissionPreflightLog e where e.mission.id = :missionId")
                .setParameter("missionId", missionId)
                .uniqueResultOptional();
    }

    @Override
    public List<MissionPreflightLog> findByMissionIdIn(Collection<Long> missionIds) {
        if (isEmpty(missionIds)) return List.of();
        return hql("select e from MissionPreflightLog e where e.mission.id in :missionIds")
                .setParameter("missionIds", missionIds)
                .getResultList();
    }

    @Override
    public List<MissionPreflightLog> findAllWithMission() {
        return withEntityGraph(
                        hql("select p from MissionPreflightLog p", MissionPreflightLog.class),
                        "mission")
                .getResultList();
    }
}
