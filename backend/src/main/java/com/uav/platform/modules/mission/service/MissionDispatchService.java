package com.uav.platform.modules.mission.service;

import com.uav.platform.modules.mission.dto.request.MissionEquipmentRedispatchRequest;
import com.uav.platform.modules.mission.dto.request.MissionResourceRedispatchRequest;
import com.uav.platform.modules.mission.dto.request.MissionUavReplacementRequest;
import com.uav.platform.modules.mission.dto.request.MissionUavUnassignmentRequest;
import com.uav.platform.modules.mission.dto.request.ResourceAssignmentRequest;
import com.uav.platform.modules.mission.dto.response.MissionDispatchResourcesResponse;
import com.uav.platform.modules.mission.dto.response.MissionResponse;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.enums.MissionEventType;
import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.uav.entity.Uav;

import org.springframework.security.core.Authentication;

/** Assigns and redispatches resources without changing lock ordering or version checks. */
public interface MissionDispatchService {
    MissionResponse assignStation(
            Long id, ResourceAssignmentRequest request, Authentication authentication);

    MissionResponse assignUav(
            Long id, ResourceAssignmentRequest request, Authentication authentication);

    MissionResponse replaceUav(
            Long id, MissionUavReplacementRequest request, Authentication authentication);

    MissionResponse unassignUav(
            Long id, MissionUavUnassignmentRequest request, Authentication authentication);

    void requireUavDispatchPermission(Authentication authentication);

    String dispatchReason(String reason);

    void requireCurrentUav(Mission mission, Long expectedId);

    void releasePreviousUav(Uav previous, Long missionId, String actor);

    void recordRedispatch(
            Mission mission,
            MissionEventType type,
            MissionStatus oldStatus,
            Long previousId,
            Long replacementId,
            String reason,
            Authentication authentication);

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

    Mission dispatchMission(Long id, Long version, Authentication authentication);

    void requireDispatchPermission(Authentication authentication, String permission);

    String resourceDispatchReason(String reason);

    void requireDifferentResource(Long oldId, Long replacementId);

    void finishResourceDispatch(
            Mission mission,
            MissionEventType type,
            MissionStatus oldStatus,
            String resource,
            Long oldId,
            Long replacementId,
            String reason,
            Authentication authentication);

    void recordResourceDispatch(
            Mission mission,
            MissionEventType type,
            MissionStatus oldStatus,
            String metadata,
            String detail,
            String reason,
            Authentication authentication);

    void bumpDispatchVersion(Mission mission);

    void ensureResourceAssignmentAllowed(Mission mission);

    void maybeMarkResourcesReserved(Mission mission, Authentication authentication);
}
