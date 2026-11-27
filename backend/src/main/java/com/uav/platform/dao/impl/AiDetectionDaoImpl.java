package com.uav.platform.dao.impl;

import com.uav.platform.dao.IAiDetectionDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.AiDetection;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class AiDetectionDaoImpl extends HibernateGenericDao<Long, AiDetection>
        implements IAiDetectionDao {

    private static final Logger logger = LoggerFactory.getLogger(AiDetectionDaoImpl.class);

    public AiDetectionDaoImpl(final EntityManager entityManager) {
        super(AiDetection.class, entityManager);
    }

    @Override
    public List<AiDetection> findByMissionIdOrderByCreatedAtDesc(Long missionId) {
        return hql("select e from AiDetection e where e.mission.id = :missionId order by e.createdAt desc")
                .setParameter("missionId", missionId)
                .getResultList();
    }

    @Override
    public List<AiDetection> findByAiTaskId(Long aiTaskId) {
        return hql("select e from AiDetection e where e.aiTask.id = :aiTaskId")
                .setParameter("aiTaskId", aiTaskId)
                .getResultList();
    }
}
