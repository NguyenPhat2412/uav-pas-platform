package com.uav.platform.service.impl.mission;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.record.mission.MissionFilter;
import com.uav.platform.dto.request.mission.*;
import com.uav.platform.dto.response.mission.*;
import com.uav.platform.service.mission.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Stable application facade; workflows join its transaction. */
@Service
@Transactional
public class MissionServiceImpl implements MissionService {
    private final MissionLifecycleService lifecycle;
    private final MissionQueryService queries;
    private final MissionDispatchService dispatch;
    private final MissionMediaService media;
    private final MissionExtendedWorkflowService extended;

    public MissionServiceImpl(
            MissionLifecycleService lifecycle,
            MissionQueryService queries,
            MissionDispatchService dispatch,
            MissionMediaService media) {
        this(lifecycle, queries, dispatch, media, null);
    }

    @Autowired
    public MissionServiceImpl(
            MissionLifecycleService lifecycle,
            MissionQueryService queries,
            MissionDispatchService dispatch,
            MissionMediaService media,
            MissionExtendedWorkflowService extended) {
        this.lifecycle = lifecycle;
        this.queries = queries;
        this.dispatch = dispatch;
        this.media = media;
        this.extended = extended;
    }

    @Override
    public MissionResponse create(MissionCreateRequest request, String actorUsername) {
        return lifecycle.create(request, actorUsername);
    }

    @Override
    public void validate(MissionCreateRequest request) {
        lifecycle.validate(request);
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
        return lifecycle.cancel(id, null, authentication);
    }

    @Override
    public MissionResponse cancel(Long id, String reason, Authentication authentication) {
        return lifecycle.cancel(id, reason, authentication);
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
    public MissionResponse forceFail(
            Long id, MissionForceFailRequest request, Authentication authentication) {
        return lifecycle.forceFail(id, request, authentication);
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

    @Override
    public MissionResponse upsertPermit(
            Long id, MissionPermitUpsertRequest request, Authentication authentication) {
        return lifecycle.upsertPermit(id, request, authentication);
    }

    @Override
    public MissionResponse verifyPermit(
            Long id, MissionPermitVerifyRequest request, Authentication authentication) {
        return lifecycle.verifyPermit(id, request, authentication);
    }

    @Override
    public MissionResponse cloneMission(Long id, Authentication authentication) {
        return requireExtended().cloneMission(id, authentication);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionReviewResponse getReview(Long id, Authentication authentication) {
        return requireExtended().getReview(id, authentication);
    }

    @Override
    public MissionReviewResponse upsertReview(
            Long id, MissionReviewUpsertRequest request, Authentication authentication) {
        return requireExtended().upsertReview(id, request, authentication);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionPreflightResponse getPreflight(Long id, Authentication authentication) {
        return requireExtended().getPreflight(id, authentication);
    }

    @Override
    public MissionPreflightResponse upsertPreflight(
            Long id, MissionPreflightUpsertRequest request, Authentication authentication) {
        return requireExtended().upsertPreflight(id, request, authentication);
    }

    @Override
    @Transactional(readOnly = true)
    public OperatorLogbookResponse operatorLogbook(Long operatorId, Authentication authentication) {
        return requireExtended().operatorLogbook(operatorId, authentication);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionDispatchCandidatesResponse dispatchCandidates(
            Long id, Authentication authentication) {
        return requireExtended().dispatchCandidates(id, authentication);
    }

    @Override
    public MissionResponse autoAssign(Long id, Authentication authentication) {
        return requireExtended().autoAssign(id, authentication);
    }

    private MissionExtendedWorkflowService requireExtended() {
        if (extended == null) {
            throw new IllegalStateException("MissionExtendedWorkflowService is not configured");
        }
        return extended;
    }
}
