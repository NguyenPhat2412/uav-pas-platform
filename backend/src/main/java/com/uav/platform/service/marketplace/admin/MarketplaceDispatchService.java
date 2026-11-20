package com.uav.platform.service.marketplace.admin;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.marketplace.admin.AutoDispatchRequest;
import com.uav.platform.dto.request.marketplace.admin.ManualDispatchRequest;
import com.uav.platform.dto.response.marketplace.admin.DispatchQueueItemResponse;
import com.uav.platform.dto.response.marketplace.admin.MarketplaceAdminStatsResponse;
import com.uav.platform.dto.response.mission.lifecycle.MissionResponse;

import org.springframework.data.domain.Pageable;

public interface MarketplaceDispatchService {

    PageResponse<DispatchQueueItemResponse> listDispatchQueue(Pageable pageable);

    MissionResponse dispatchManual(
            Long missionId, ManualDispatchRequest request, String adminUsername);

    MissionResponse dispatchAuto(Long missionId, String note, String adminUsername);

    MissionResponse dispatchAutoNext(AutoDispatchRequest request, String adminUsername);

    MarketplaceAdminStatsResponse getStats();
}
