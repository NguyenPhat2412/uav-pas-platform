package com.uav.platform.dao.impl;

import com.uav.platform.dao.IMissionEquipmentReservationDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.MissionEquipmentReservation;
import com.uav.platform.enums.*;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class MissionEquipmentReservationDaoImpl
        extends HibernateGenericDao<Long, MissionEquipmentReservation>
        implements IMissionEquipmentReservationDao {

    private static final Logger logger =
            LoggerFactory.getLogger(MissionEquipmentReservationDaoImpl.class);

    public MissionEquipmentReservationDaoImpl(final EntityManager entityManager) {
        super(MissionEquipmentReservation.class, entityManager);
    }

    @Override
    public List<MissionEquipmentReservation> findByMissionIdAndReleasedFalse(Long missionId) {
        return hql("select e from MissionEquipmentReservation e where e.mission.id = :missionId and e.released = false")
                .setParameter("missionId", missionId)
                .getResultList();
    }

    @Override
    public List<MissionEquipmentReservation> findByMissionIdOrderByIdAsc(Long missionId) {
        return hql("select e from MissionEquipmentReservation e where e.mission.id = :missionId order by e.id asc")
                .setParameter("missionId", missionId)
                .getResultList();
    }

    @Override
    public long activeQuantity(Long id) {
        Long v =
                hql(
                                "select coalesce(sum(r.quantity), 0) from MissionEquipmentReservation r where r.equipment.id = :id and r.released = false",
                                Long.class)
                        .setParameter("id", id)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public boolean existsByMissionIdAndReleasedFalse(Long missionId) {
        return !hql(
                        "select 1 from MissionEquipmentReservation e where e.mission.id = :missionId and e.released = false",
                        Integer.class)
                .setParameter("missionId", missionId)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }
}
