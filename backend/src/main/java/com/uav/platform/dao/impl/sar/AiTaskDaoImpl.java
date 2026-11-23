package com.uav.platform.dao.impl.sar;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.sar.IAiTaskDao;
import com.uav.platform.entity.sar.AiTask;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class AiTaskDaoImpl extends HibernateGenericDao<Long, AiTask> implements IAiTaskDao {

    private static final Logger logger = LoggerFactory.getLogger(AiTaskDaoImpl.class);

    public AiTaskDaoImpl(final EntityManager entityManager) {
        super(AiTask.class, entityManager);
    }

    @Override
    public List<AiTask> findByMissionIdOrderByCreatedAtDesc(Long missionId) {
        return hql("select e from AiTask e where e.mission.id = :missionId order by e.createdAt desc")
                .setParameter("missionId", missionId)
                .getResultList();
    }

    @Override
    public java.util.Optional<AiTask> findByIdForUpdate(Long id) {
        return hql("select t from AiTask t where t.id = :id", AiTask.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }
}
