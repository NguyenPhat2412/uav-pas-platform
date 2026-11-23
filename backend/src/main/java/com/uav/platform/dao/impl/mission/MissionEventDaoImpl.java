package com.uav.platform.dao.impl.mission;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.mission.IMissionEventDao;
import com.uav.platform.entity.mission.MissionEvent;
import com.uav.platform.enums.mission.*;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class MissionEventDaoImpl extends HibernateGenericDao<Long, MissionEvent>
        implements IMissionEventDao {

    private static final Logger logger = LoggerFactory.getLogger(MissionEventDaoImpl.class);

    public MissionEventDaoImpl(final EntityManager entityManager) {
        super(MissionEvent.class, entityManager);
    }

    @Override
    public List<MissionEvent> findByMissionIdOrderByCreatedAtAsc(Long missionId) {
        return hql("select e from MissionEvent e where e.mission.id = :missionId order by e.createdAt asc")
                .setParameter("missionId", missionId)
                .getResultList();
    }

    @Override
    public List<MissionEvent> findConfirmationTimelineEvents() {
        return hql(
                        "select e from MissionEvent e join fetch e.mission where e.eventType = com.uav.platform.enums.mission.MissionEventType.SUBMITTED or e.newStatus in (com.uav.platform.enums.mission.MissionStatus.PENDING_CONFIRMATION, com.uav.platform.enums.mission.MissionStatus.CONFIRMED)",
                        MissionEvent.class)
                .getResultList();
    }
}
