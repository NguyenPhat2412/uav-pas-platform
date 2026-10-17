package com.uav.platform.modules.mission.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.mission.dto.record.MissionFilter;
import com.uav.platform.modules.mission.dto.request.*;
import com.uav.platform.modules.mission.dto.response.*;
import com.uav.platform.modules.mission.service.*;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Stable application facade; workflows join its transaction. */
@Service
@Transactional
@RequiredArgsConstructor
public class MissionServiceImpl implements MissionService {
    private final MissionLifecycleService lifecycle;
    private final MissionQueryService queries;
    private final MissionDispatchService dispatch;
    private final MissionMediaService media;

    @Override
    public MissionResponse create(MissionCreateRequest request, String actorUsername) {
        return lifecycle.create(request, actorUsername);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionResponse get(Long id, Authentication authentication) {
        return queries.get(id, authentication);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MissionResponse> list(
            MissionFilter filter, Pageable pageable, Authentication authentication) {
        return queries.list(filter, pageable, authentication);
    }

    @Override
    public MissionResponse updateDraft(
            Long id, MissionUpdateRequest request, Authentication authentication) {
        return lifecycle.updateDraft(id, request, authentication);
    }

    @Override
    public MissionResponse submit(Long id, Authentication authentication) {
        return lifecycle.submit(id, authentication);
    }

    @Override
    public MissionResponse cancel(Long id, Authentication authentication) {
        return lifecycle.cancel(id, authentication);
    }

    @Override
    public MissionResponse assignStation(
            Long id, ResourceAssignmentRequest request, Authentication authentication) {
        return dispatch.assignStation(id, request, authentication);
    }

    @Override
    public MissionResponse assignUav(
            Long id, ResourceAssignmentRequest request, Authentication authentication) {
        return dispatch.assignUav(id, request, authentication);
    }

    @Override
    public MissionResponse replaceUav(
            Long id, MissionUavReplacementRequest request, Authentication authentication) {
        return dispatch.replaceUav(id, request, authentication);
    }

    @Override
    public MissionResponse unassignUav(
            Long id, MissionUavUnassignmentRequest request, Authentication authentication) {
        return dispatch.unassignUav(id, request, authentication);
    }

    @Override
    public MissionResponse assignOperator(
            Long id, ResourceAssignmentRequest request, Authentication authentication) {
        return dispatch.assignOperator(id, request, authentication);
    }

    @Override
    public MissionResponse reserveEquipment(
            Long id, ResourceAssignmentRequest request, Authentication authentication) {
        return dispatch.reserveEquipment(id, request, authentication);
    }

    @Override
    public MissionDispatchResourcesResponse dispatchResources(
            Long id, Authentication authentication) {
        return dispatch.dispatchResources(id, authentication);
    }

    @Override
    public MissionResponse redispatchOperator(
            Long id, MissionResourceRedispatchRequest request, Authentication authentication) {
        return dispatch.redispatchOperator(id, request, authentication);
    }

    @Override
    public MissionResponse redispatchStation(
            Long id, MissionResourceRedispatchRequest request, Authentication authentication) {
        return dispatch.redispatchStation(id, request, authentication);
    }

    @Override
    public MissionResponse redispatchEquipment(
            Long id, MissionEquipmentRedispatchRequest request, Authentication authentication) {
        return dispatch.redispatchEquipment(id, request, authentication);
    }

    @Override
    public MissionResponse confirm(Long id, Authentication authentication) {
        return lifecycle.confirm(id, authentication);
    }

    @Override
    public MissionResponse reject(Long id, String reason, Authentication authentication) {
        return lifecycle.reject(id, reason, authentication);
    }

    @Override
    public MissionResponse ready(Long id, Authentication authentication) {
        return lifecycle.ready(id, authentication);
    }

    @Override
    public MissionResponse start(Long id, Authentication authentication) {
        return lifecycle.start(id, authentication);
    }

    @Override
    public MissionResponse complete(
            Long id, MissionCompletionRequest request, Authentication authentication) {
        return lifecycle.complete(id, request, authentication);
    }

    @Override
    public MissionResponse fail(
            Long id, MissionFailureRequest request, Authentication authentication) {
        return lifecycle.fail(id, request, authentication);
    }

    @Override
    public MissionMediaResponse attachMedia(
            Long id, MissionMediaRequest request, Authentication authentication) {
        return media.attachMedia(id, request, authentication);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionMediaResponse> listMedia(Long id, Authentication authentication) {
        return media.listMedia(id, authentication);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionEventResponse> timeline(Long id, Authentication authentication) {
        return queries.timeline(id, authentication);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionAvailabilityResponse availability(
            java.time.LocalDateTime startTime,
            java.time.LocalDateTime endTime,
            Long stationId,
            Long uavId,
            Long operatorId) {
        return queries.availability(startTime, endTime, stationId, uavId, operatorId);
    }

    @Override
    public MissionResponse acceptOperator(
            Long id, MissionAcceptanceRequest request, Authentication authentication) {
        return lifecycle.acceptOperator(id, request, authentication);
    }

    @Override
    public MissionResponse reportOperatorConflict(
            Long id, String note, Authentication authentication) {
        return lifecycle.reportOperatorConflict(id, note, authentication);
    }
}
