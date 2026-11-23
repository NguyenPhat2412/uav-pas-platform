package com.uav.platform.dao.media;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.media.MediaAsset;
import com.uav.platform.enums.media.*;

public interface IMediaAssetDao extends IGenericDao<Long, MediaAsset> {
    java.util.Optional<MediaAsset> findByObjectKey(String objectKey);

    java.util.Optional<MediaAsset> findByIdForUpdate(Long id);

    java.util.List<Long> cleanupCandidates(
            java.time.LocalDateTime now, java.time.LocalDateTime cutoff, int batch);
}
