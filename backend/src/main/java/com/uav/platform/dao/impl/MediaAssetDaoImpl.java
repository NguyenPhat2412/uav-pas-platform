package com.uav.platform.dao.impl;

import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.MediaAsset;
import com.uav.platform.enums.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class MediaAssetDaoImpl extends HibernateGenericDao<Long, MediaAsset>
        implements IMediaAssetDao {

    private static final Logger logger = LoggerFactory.getLogger(MediaAssetDaoImpl.class);

    public MediaAssetDaoImpl(final EntityManager entityManager) {
        super(MediaAsset.class, entityManager);
    }

    @Override
    public java.util.Optional<MediaAsset> findByObjectKey(String objectKey) {
        return hql("select e from MediaAsset e where e.objectKey = :objectKey")
                .setParameter("objectKey", objectKey)
                .uniqueResultOptional();
    }

    @Override
    public java.util.Optional<MediaAsset> findByIdForUpdate(Long id) {
        return hql("select a from MediaAsset a where a.id=:id", MediaAsset.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public java.util.List<Long> cleanupCandidates(
            java.time.LocalDateTime now, java.time.LocalDateTime cutoff, int batch) {
        List<?> raw =
                nativeSql(
                                """
        SELECT a.id FROM media_assets a
        WHERE NOT EXISTS(SELECT 1 FROM mission_media m WHERE m.media_id=a.id)
          AND ((a.deleted=true AND (a.delete_after IS NULL OR a.delete_after<=:now))
           OR (a.deleted=false AND a.confirmed=false AND a.created_at<=:cutoff))
        ORDER BY COALESCE(a.delete_after,a.created_at),a.id LIMIT :batch
        """,
                                Object.class)
                        .setParameter("now", now)
                        .setParameter("cutoff", cutoff)
                        .setParameter("batch", batch)
                        .getResultList();
        return raw.stream().map(v -> ((Number) v).longValue()).toList();
    }
}
