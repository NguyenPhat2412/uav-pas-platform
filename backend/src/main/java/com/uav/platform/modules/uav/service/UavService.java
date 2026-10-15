package com.uav.platform.modules.uav.service;


import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.uav.config.request.UavRequest;
import com.uav.platform.modules.uav.config.response.UavResponse;
import com.uav.platform.modules.uav.config.response.UavStatusHistoryResponse;
import com.uav.platform.modules.uav.common.UavStatus;
import org.springframework.data.domain.Pageable;

public interface UavService {
    PageResponse<UavResponse> list(Pageable pageable);
    UavResponse get(Long id);
    UavResponse create(UavRequest request, String actor);
    UavResponse update(Long id, UavRequest request, String actor);
    UavResponse assign(Long id, Long stationId, String actor);
    UavResponse changeStatus(Long id, UavStatus status, String reason, String actor);
    UavResponse changeStatus(Long id, UavStatus status, String reason, UavStatus expectedStatus, String actor);
    /** Internal mission lifecycle command; never exposed as a manual status endpoint. */
    UavResponse changeMissionStatus(Long id, UavStatus status, String reason, String actor);
    UavResponse maintenance(Long id, String actor);
    UavResponse maintenance(Long id, String reason, UavStatus expectedStatus, String actor);
    PageResponse<UavStatusHistoryResponse> history(Long id, Pageable pageable);
}
