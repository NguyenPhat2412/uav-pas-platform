package com.uav.platform.dao.impl;

import com.uav.platform.dao.IUavTelemetryDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.UavTelemetry;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class UavTelemetryDaoImpl extends HibernateGenericDao<Long, UavTelemetry>
        implements IUavTelemetryDao {

    private static final Logger logger = LoggerFactory.getLogger(UavTelemetryDaoImpl.class);

    public UavTelemetryDaoImpl(final EntityManager entityManager) {
        super(UavTelemetry.class, entityManager);
    }

    @Override
    public Optional<UavTelemetry> findFirstByUavIdOrderByRecordedAtDesc(Long uavId) {
        List<UavTelemetry> rows =
                hql("select e from UavTelemetry e where e.uavId = :uavId order by e.recordedAt desc")
                        .setParameter("uavId", uavId)
                        .setMaxResults(1)
                        .getResultList();
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public Optional<UavTelemetry> findFirstByUavIdAndMissionIdOrderByRecordedAtDesc(
            Long uavId, Long missionId) {
        List<UavTelemetry> rows =
                hql("select e from UavTelemetry e where e.uavId = :uavId and e.missionId = :missionId order by e.recordedAt desc")
                        .setParameter("uavId", uavId)
                        .setParameter("missionId", missionId)
                        .setMaxResults(1)
                        .getResultList();
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public List<UavTelemetry> findByMissionIdOrderByRecordedAtAsc(Long missionId) {
        return hql("select e from UavTelemetry e where e.missionId = :missionId order by e.recordedAt asc")
                .setParameter("missionId", missionId)
                .getResultList();
    }

    @Override
    public List<UavTelemetry> latestPerUav() {
        return nativeSql(
                        "SELECT DISTINCT ON (uav_id) * FROM uav_telemetry ORDER BY uav_id, recorded_at DESC",
                        UavTelemetry.class)
                .getResultList();
    }
}
