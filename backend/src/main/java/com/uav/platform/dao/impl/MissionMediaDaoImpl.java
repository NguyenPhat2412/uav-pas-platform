package com.uav.platform.dao.impl;

import com.uav.platform.dao.IMissionMediaDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.MissionMedia;
import com.uav.platform.enums.*;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class MissionMediaDaoImpl extends HibernateGenericDao<Long, MissionMedia>
        implements IMissionMediaDao {

    private static final Logger logger = LoggerFactory.getLogger(MissionMediaDaoImpl.class);

    public MissionMediaDaoImpl(final EntityManager entityManager) {
        super(MissionMedia.class, entityManager);
    }

    @Override
    public boolean existsByMediaId(Long mediaId) {
        return !hql("select 1 from MissionMedia e where e.media.id = :mediaId", Integer.class)
                .setParameter("mediaId", mediaId)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public List<MissionMedia> findByMissionIdOrderByCreatedAtAsc(Long missionId) {
        return hql("select e from MissionMedia e where e.mission.id = :missionId order by e.createdAt asc")
                .setParameter("missionId", missionId)
                .getResultList();
    }

    @Override
    public boolean existsByMissionIdAndMediaId(Long missionId, Long mediaId) {
        return !hql(
                        "select 1 from MissionMedia e where e.mission.id = :missionId and e.media.id = :mediaId",
                        Integer.class)
                .setParameter("missionId", missionId)
                .setParameter("mediaId", mediaId)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public boolean existsByMissionIdAndMediaRoleInAndMediaConfirmedTrueAndMediaDeletedFalse(
            Long missionId, java.util.Collection<com.uav.platform.enums.MediaRole> roles) {
        if (isEmpty(roles)) return false;
        return !hql(
                        "select 1 from MissionMedia e where e.mission.id = :missionId and e.mediaRole in :roles and e.media.confirmed = true and e.media.deleted = false",
                        Integer.class)
                .setParameter("missionId", missionId)
                .setParameter("roles", roles)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }
}
