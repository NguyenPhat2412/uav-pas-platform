package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.AutoDispatchRequest;
import com.uav.platform.dto.request.ManualDispatchRequest;
import com.uav.platform.dto.response.DispatchQueueItemResponse;
import com.uav.platform.dto.response.MarketplaceAdminStatsResponse;
import com.uav.platform.dto.response.MissionResponse;

import org.springframework.data.domain.Pageable;

public interface MarketplaceDispatchService {

    PageResponse<DispatchQueueItemResponse> listDispatchQueue(Pageable pageable);

    MissionResponse dispatchManual(
            Long missionId, ManualDispatchRequest request, String adminUsername);

    MissionResponse dispatchAuto(Long missionId, String note, String adminUsername);

    MissionResponse dispatchAutoNext(AutoDispatchRequest request, String adminUsername);

    MarketplaceAdminStatsResponse getStats();
}
