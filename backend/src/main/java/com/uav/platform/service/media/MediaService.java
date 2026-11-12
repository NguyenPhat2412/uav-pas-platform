package com.uav.platform.service.media;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.media.*;
import com.uav.platform.dto.response.media.*;

import org.springframework.data.domain.Pageable;

public interface MediaService {
    PageResponse<MediaAssetResponse> list(Pageable pageable);

    MediaAssetResponse register(MediaUploadRequest request, String actor);

    SignedMediaUrlResponse uploadUrl(Long id);

    SignedMediaUrlResponse downloadUrl(Long id, String actor);

    MediaAssetResponse confirm(Long id, String actor);

    MediaAssetResponse confirmMission(Long id, Long missionId, String actor);

    SignedMediaUrlResponse registerMissionUploadUrl(
            Long missionId, MediaUploadRequest request, String actor);

    void delete(Long id, String actor);
}
