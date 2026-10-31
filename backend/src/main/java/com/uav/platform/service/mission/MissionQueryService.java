package com.uav.platform.service.mission;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.record.mission.MissionFilter;
import com.uav.platform.dto.response.mission.MissionAvailabilityResponse;
import com.uav.platform.dto.response.mission.MissionEventResponse;
import com.uav.platform.dto.response.mission.MissionResponse;

import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.List;

/** Read-only mission queries, visibility and availability. */
public interface MissionQueryService {
    MissionResponse get(Long id, Authentication authentication);

    PageResponse<MissionResponse> list(
            MissionFilter filter, Pageable pageable, Authentication authentication);

    List<MissionEventResponse> timeline(Long id, Authentication authentication);

    MissionAvailabilityResponse availability(
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long stationId,
            Long uavId,
            Long operatorId);
}
