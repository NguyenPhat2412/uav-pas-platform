package com.uav.platform.modules.mission.service;


import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.mission.config.request.*;
import com.uav.platform.modules.mission.config.response.*;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.time.LocalDateTime;

public interface MissionService {
    MissionResponse create(MissionCreateRequest request, String actorUsername);
    MissionResponse get(Long id, Authentication authentication);
    PageResponse<MissionResponse> list(MissionFilter filter, Pageable pageable, Authentication authentication);
    MissionResponse updateDraft(Long id, MissionUpdateRequest request, Authentication authentication);
    MissionResponse submit(Long id, Authentication authentication);
    MissionResponse cancel(Long id, Authentication authentication);
    MissionResponse assignStation(Long id, ResourceAssignmentRequest request, Authentication authentication);
    MissionResponse assignUav(Long id, ResourceAssignmentRequest request, Authentication authentication);
    default MissionResponse assignUav(Long id, Long uavId, Authentication authentication) {
        return assignUav(id, new ResourceAssignmentRequest(uavId), authentication);
    }
    MissionResponse assignOperator(Long id, ResourceAssignmentRequest request, Authentication authentication);
    MissionResponse reserveEquipment(Long id, ResourceAssignmentRequest request, Authentication authentication);
    MissionResponse confirm(Long id, Authentication authentication);
    MissionResponse reject(Long id, String reason, Authentication authentication);
    MissionResponse ready(Long id, Authentication authentication);
    MissionResponse start(Long id, Authentication authentication);
    MissionResponse complete(Long id, MissionCompletionRequest request, Authentication authentication);
    MissionResponse fail(Long id, MissionFailureRequest request, Authentication authentication);
    MissionMediaResponse attachMedia(Long id, MissionMediaRequest request, Authentication authentication);
    List<MissionMediaResponse> listMedia(Long id, Authentication authentication);
    List<MissionEventResponse> timeline(Long id, Authentication authentication);
    MissionAvailabilityResponse availability(LocalDateTime startTime, LocalDateTime endTime, Long stationId, Long uavId, Long operatorId);
    MissionResponse acceptOperator(Long id, Authentication authentication);
    MissionResponse reportOperatorConflict(Long id, String note, Authentication authentication);
}
