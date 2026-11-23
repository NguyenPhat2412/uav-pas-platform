package com.uav.platform.dao.impl.simulation;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.simulation.ISimulationRunLogDao;
import com.uav.platform.entity.simulation.SimulationRunLog;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class SimulationRunLogDaoImpl extends HibernateGenericDao<Long, SimulationRunLog>
        implements ISimulationRunLogDao {

    private static final Logger logger = LoggerFactory.getLogger(SimulationRunLogDaoImpl.class);

    public SimulationRunLogDaoImpl(final EntityManager entityManager) {
        super(SimulationRunLog.class, entityManager);
    }

    @Override
    public List<SimulationRunLog> findTop25ByOrderByStartedAtDesc() {
        return hql("select e from SimulationRunLog e order by e.startedAt desc")
                .setMaxResults(25)
                .getResultList();
    }

    @Override
    public List<SimulationRunLog> findTop25ByUavIdOrderByStartedAtDesc(Long uavId) {
        return hql("select e from SimulationRunLog e where e.uavId = :uavId order by e.startedAt desc")
                .setParameter("uavId", uavId)
                .setMaxResults(25)
                .getResultList();
    }

    @Override
    public List<SimulationRunLog> findTop25ByMissionIdOrderByStartedAtDesc(Long missionId) {
        return hql("select e from SimulationRunLog e where e.missionId = :missionId order by e.startedAt desc")
                .setParameter("missionId", missionId)
                .setMaxResults(25)
                .getResultList();
    }
}
