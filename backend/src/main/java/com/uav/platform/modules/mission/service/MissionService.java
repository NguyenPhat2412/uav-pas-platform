package com.uav.platform.modules.mission.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.mission.dto.record.MissionFilter;
import com.uav.platform.modules.mission.dto.request.*;
import com.uav.platform.modules.mission.dto.response.*;

import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.List;

public interface MissionService {
    MissionResponse create(MissionCreateRequest request, String actorUsername);

    /** Runs every create rule without saving; throws the same field errors create would. */
    void validate(MissionCreateRequest request);

    MissionResponse get(Long id, Authentication authentication);

    PageResponse<MissionResponse> list(
            MissionFilter filter, Pageable pageable, Authentication authentication);

    MissionResponse updateDraft(
            Long id, MissionUpdateRequest request, Authentication authentication);

    MissionResponse submit(Long id, Authentication authentication);

    MissionResponse cancel(Long id, Authentication authentication);

    MissionResponse assignStation(
            Long id, ResourceAssignmentRequest request, Authentication authentication);

    MissionResponse assignUav(
            Long id, ResourceAssignmentRequest request, Authentication authentication);

    default MissionResponse assignUav(Long id, Long uavId, Authentication authentication) {
        return assignUav(id, new ResourceAssignmentRequest(uavId), authentication);
    }

    MissionResponse replaceUav(
            Long id, MissionUavReplacementRequest request, Authentication authentication);

    MissionResponse unassignUav(
            Long id, MissionUavUnassignmentRequest request, Authentication authentication);

    MissionResponse assignOperator(
            Long id, ResourceAssignmentRequest request, Authentication authentication);

    MissionResponse reserveEquipment(
            Long id, ResourceAssignmentRequest request, Authentication authentication);

    MissionDispatchResourcesResponse dispatchResources(Long id, Authentication authentication);

    MissionResponse redispatchOperator(
            Long id, MissionResourceRedispatchRequest request, Authentication authentication);

    MissionResponse redispatchStation(
            Long id, MissionResourceRedispatchRequest request, Authentication authentication);

    MissionResponse redispatchEquipment(
            Long id, MissionEquipmentRedispatchRequest request, Authentication authentication);

    MissionResponse confirm(Long id, Authentication authentication);

    MissionResponse reject(Long id, String reason, Authentication authentication);

    MissionResponse ready(Long id, Authentication authentication);

    MissionResponse start(Long id, Authentication authentication);

    MissionResponse complete(
            Long id, MissionCompletionRequest request, Authentication authentication);

    MissionResponse fail(Long id, MissionFailureRequest request, Authentication authentication);

    MissionMediaResponse attachMedia(
            Long id, MissionMediaRequest request, Authentication authentication);

    List<MissionMediaResponse> listMedia(Long id, Authentication authentication);

    List<MissionEventResponse> timeline(Long id, Authentication authentication);

    MissionAvailabilityResponse availability(
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long stationId,
            Long uavId,
            Long operatorId);

    MissionResponse acceptOperator(
            Long id, MissionAcceptanceRequest request, Authentication authentication);

    MissionResponse reportOperatorConflict(Long id, String note, Authentication authentication);
}
