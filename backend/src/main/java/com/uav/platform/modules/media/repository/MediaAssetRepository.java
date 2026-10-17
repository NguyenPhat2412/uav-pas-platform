package com.uav.platform.modules.media.repository;

import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.enums.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MediaAssetRepository
        extends JpaRepository<MediaAsset, Long>, JpaSpecificationExecutor<MediaAsset> {
    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select a from MediaAsset a where a.id=:id")
    java.util.Optional<MediaAsset> findByIdForUpdate(
            @org.springframework.data.repository.query.Param("id") Long id);

    @org.springframework.data.jpa.repository.Query(
            value =
                    """
        SELECT a.id FROM media_assets a
        WHERE NOT EXISTS(SELECT 1 FROM mission_media m WHERE m.media_id=a.id)
          AND ((a.deleted=true AND (a.delete_after IS NULL OR a.delete_after<=:now))
           OR (a.deleted=false AND a.confirmed=false AND a.created_at<=:cutoff))
        ORDER BY COALESCE(a.delete_after,a.created_at),a.id LIMIT :batch
        """,
            nativeQuery = true)
    java.util.List<Long> cleanupCandidates(
            @org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now,
            @org.springframework.data.repository.query.Param("cutoff")
                    java.time.LocalDateTime cutoff,
            @org.springframework.data.repository.query.Param("batch") int batch);
}
