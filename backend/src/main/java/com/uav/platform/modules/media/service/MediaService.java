package com.uav.platform.modules.media.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.media.dto.request.*;
import com.uav.platform.modules.media.dto.response.*;

import org.springframework.data.domain.Pageable;

public interface MediaService {
    PageResponse<MediaAssetResponse> list(Pageable pageable);

    MediaAssetResponse register(MediaUploadRequest request, String actor);

    SignedMediaUrlResponse uploadUrl(Long id);

    SignedMediaUrlResponse downloadUrl(Long id, String actor);

    MediaAssetResponse confirm(Long id, String actor);

    MediaAssetResponse confirmMission(Long id, Long missionId, String actor);

    void delete(Long id, String actor);
}
