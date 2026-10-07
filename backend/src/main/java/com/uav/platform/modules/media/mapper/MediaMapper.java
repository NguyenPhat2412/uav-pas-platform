package com.uav.platform.modules.media.mapper;

import com.uav.platform.modules.media.config.response.MediaAssetResponse;
import com.uav.platform.modules.media.entity.MediaAsset;

public final class MediaMapper {
    private MediaMapper() {}
    public static MediaAssetResponse toResponse(MediaAsset asset) {
        return new MediaAssetResponse(asset.getId(), asset.getOriginalName(), asset.getObjectKey(), asset.getContentType(), asset.getSize(),
                asset.getType(), asset.getLinkedEntityType(), asset.getLinkedEntityId(), asset.getUploadedBy(), asset.getStorageProvider(),
                asset.isConfirmed(), asset.getConfirmedAt(), asset.getCreatedAt());
    }
}
