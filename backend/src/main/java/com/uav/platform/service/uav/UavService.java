package com.uav.platform.service.uav;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.uav.UavRequest;
import com.uav.platform.dto.response.uav.UavResponse;
import com.uav.platform.dto.response.uav.UavStatusHistoryResponse;
import com.uav.platform.enums.uav.UavStatus;

import org.springframework.data.domain.Pageable;

public interface UavService {
    PageResponse<UavResponse> list(Pageable pageable);

    UavResponse get(Long id);

    UavResponse create(UavRequest request, String actor);

    UavResponse update(Long id, UavRequest request, String actor);

    UavResponse assign(Long id, Long stationId, String actor);

    UavResponse changeStatus(Long id, UavStatus status, String reason, String actor);

    UavResponse changeStatus(
            Long id, UavStatus status, String reason, UavStatus expectedStatus, String actor);

    /** Internal mission lifecycle command; never exposed as a manual status endpoint. */
    UavResponse changeMissionStatus(Long id, UavStatus status, String reason, String actor);

    UavResponse maintenance(Long id, String actor);

    UavResponse maintenance(Long id, String reason, UavStatus expectedStatus, String actor);

    PageResponse<UavStatusHistoryResponse> history(Long id, Pageable pageable);
}
