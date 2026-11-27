package com.uav.platform.dao.impl;

import com.uav.platform.dao.ISarMissionDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.SarMission;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class SarMissionDaoImpl extends HibernateGenericDao<Long, SarMission>
        implements ISarMissionDao {

    private static final Logger logger = LoggerFactory.getLogger(SarMissionDaoImpl.class);

    public SarMissionDaoImpl(final EntityManager entityManager) {
        super(SarMission.class, entityManager);
    }

    @Override
    public Optional<SarMission> findByMissionId(Long missionId) {
        return hql("select e from SarMission e where e.mission.id = :missionId")
                .setParameter("missionId", missionId)
                .uniqueResultOptional();
    }

    @Override
    public org.springframework.data.domain.Page<SarMission> findAll(
            com.uav.platform.dao.base.HibernateSpecification<SarMission> spec,
            org.springframework.data.domain.Pageable pageable) {
        return findAllWithGraph(
                spec,
                pageable,
                "mission",
                "mission.uav",
                "mission.uav.station",
                "mission.station",
                "mission.operator");
    }
}
