package com.uav.platform.modules.mission.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.mission.dto.request.*;
import com.uav.platform.modules.mission.dto.response.*;
import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.mapper.MissionMapper;
import com.uav.platform.modules.mission.repository.MissionEventRepository;
import com.uav.platform.modules.mission.repository.MissionMediaRepository;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.repository.ServiceOfferingRepository;
import com.uav.platform.modules.mission.service.MissionAccessService;
import com.uav.platform.modules.mission.service.MissionBillingService;
import com.uav.platform.modules.mission.service.MissionEventService;
import com.uav.platform.modules.mission.service.MissionLifecycleService;
import com.uav.platform.modules.mission.service.MissionResourceService;
import com.uav.platform.modules.uav.enums.UavStatus;
import com.uav.platform.modules.user.entity.AppUser;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Mission creation, editing, acceptance and terminal state transitions. */
@Service
@Transactional
@RequiredArgsConstructor
public class MissionLifecycleServiceImpl implements MissionLifecycleService {
    private final MissionRepository missions;
    private final ServiceOfferingRepository services;
    private final AuditLogService audit;
    private final MissionEventRepository events;
    private final com.uav.platform.modules.billing.service.QuotaService quotaService;
    private final MissionMediaRepository missionMedia;
    private final MissionAccessService access;
    private final MissionEventService missionEvents;
    private final MissionResourceService resources;
    private final MissionBillingService billing;
    private final MissionMapper missionMapper;

    @Override
    public MissionResponse create(MissionCreateRequest request, String actorUsername) {
        AppUser customer = access.user(actorUsername);
        double estimatedHours =
                billing.calculateDurationHours(request.startTime(), request.expectedEndTime());
        if (quotaService != null && customer.getId() != null) {
            try {
                quotaService.checkCanCreateMission(customer.getId(), estimatedHours);
            } catch (SystemException ex) {
                if (ex.getStatus() == org.springframework.http.HttpStatus.CONFLICT) {
                    throw ex;
                }
            }
        }
        Mission mission =
                MissionOperations.draft(
                        customer,
                        request.missionType(),
                        request.title(),
                        request.description(),
                        request.requestedDate(),
                        request.startTime(),
                        request.expectedEndTime(),
                        request.locationName(),
                        request.latitude(),
                        request.longitude(),
                        request.priority(),
                        request.notes());
        mission.setCode(nextCode(request.requestedDate().getYear()));
        applyFlightPlan(mission, request.flightPlan());
        if (request.serviceId() != null) {
            ServiceOffering service =
                    services.findById(request.serviceId())
                            .orElseThrow(() -> SystemException.notFound("UAV service not found"));
            if (!service.isActive()) throw SystemException.conflict("UAV service is inactive");
            mission.setService(service);
        }
        Mission saved = missions.save(mission);
        events.save(
                new MissionEvent(
                        saved,
                        MissionEventType.CREATED,
                        customer,
                        null,
                        MissionStatus.DRAFT,
                        "Mission created",
                        null));
        audit.record(
                customer.getId(),
                actorUsername,
                AuditAction.CREATE,
                "MISSION",
                saved.getId().toString(),
                saved.getCode());
        return missionMapper.toResponse(saved);
    }

    @Override
    public MissionResponse updateDraft(
            Long id, MissionUpdateRequest request, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        if (request.expectedVersion() == null || request.expectedVersion() < 0) {
            throw SystemException.badRequest("MISSION_DRAFT_VERSION_REQUIRED");
        }
        if (mission.getVersion() != request.expectedVersion()) {
            throw SystemException.conflict("MISSION_DRAFT_STALE");
        }
        MissionOperations.updateDraft(
                mission,
                request.title(),
                request.description(),
                request.requestedDate(),
                request.startTime(),
                request.expectedEndTime(),
                request.locationName(),
                request.latitude(),
                request.longitude(),
                request.priority(),
                request.notes());
        if (request.flightPlan() != null) applyFlightPlan(mission, request.flightPlan());
        events.save(
                new MissionEvent(
                        mission,
                        MissionEventType.UPDATED,
                        access.user(authentication.getName()),
                        MissionStatus.DRAFT,
                        MissionStatus.DRAFT,
                        "Mission updated",
                        null));
        audit.record(
                null,
                authentication.getName(),
                AuditAction.UPDATE,
                "MISSION",
                id.toString(),
                mission.getCode());
        // Return the version persisted by this edit, not the pre-flush JPA version.
        missions.flush();
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse submit(Long id, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        MissionStatus old = mission.getStatus();
        MissionOperations.transitionTo(mission, MissionStatus.PENDING_CONFIRMATION);
        missionEvents.record(
                mission,
                MissionEventType.SUBMITTED,
                authentication,
                old,
                mission.getStatus(),
                "Mission submitted");
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                "PENDING_CONFIRMATION");
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse cancel(Long id, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        MissionStatus old = mission.getStatus();
        resources.releaseResources(mission, authentication.getName());
        MissionOperations.transitionTo(mission, MissionStatus.CANCELLED);
        missionEvents.record(
                mission,
                MissionEventType.CANCELLED,
                authentication,
                old,
                mission.getStatus(),
                "Mission cancelled");
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                "CANCELLED");
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse confirm(Long id, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        MissionStatus old = mission.getStatus();
        MissionOperations.transitionTo(mission, MissionStatus.CONFIRMED);
        missionEvents.record(
                mission,
                MissionEventType.STATUS_CHANGED,
                authentication,
                old,
                mission.getStatus(),
                "Mission confirmed");
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                "CONFIRMED");
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse reject(Long id, String reason, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        if (reason != null && reason.length() > 500)
            throw new IllegalArgumentException("Lý do từ chối không được vượt quá 500 ký tự.");
        MissionStatus old = mission.getStatus();
        MissionOperations.transitionTo(mission, MissionStatus.REJECTED);
        resources.releaseResources(mission, authentication.getName());
        missionEvents.record(
                mission,
                MissionEventType.REJECTED,
                authentication,
                old,
                mission.getStatus(),
                reason);
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                "REJECTED:" + reason);
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse ready(Long id, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        if (mission.getStatus() != MissionStatus.RESOURCE_RESERVED)
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        resources.validatePreflightResources(mission);
        requireAcceptance(mission);
        MissionStatus old = mission.getStatus();
        MissionOperations.transitionTo(mission, MissionStatus.READY);
        missionEvents.record(
                mission,
                MissionEventType.STATUS_CHANGED,
                authentication,
                old,
                mission.getStatus(),
                "Mission ready");
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                "READY");
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse start(Long id, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        access.requireAssignedOperator(mission, authentication);
        if (mission.getStatus() != MissionStatus.READY)
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        resources.validatePreflightResources(mission);
        requireAcceptance(mission);
        MissionStatus old = mission.getStatus();
        MissionOperations.transitionTo(mission, MissionStatus.IN_PROGRESS);
        resources.changeUavStatus(
                mission.getUav(), UavStatus.IN_USE, "Mission started", authentication.getName());
        missionEvents.record(
                mission,
                MissionEventType.STATUS_CHANGED,
                authentication,
                old,
                mission.getStatus(),
                "Mission started");
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                "IN_PROGRESS");
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse complete(
            Long id, MissionCompletionRequest request, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        access.requireAssignedOperator(mission, authentication);
        if (mission.getStatus() != MissionStatus.IN_PROGRESS)
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        if (request == null
                || request.completionNote() == null
                || request.completionNote().isBlank()
                || request.equipmentCondition() == null
                || request.equipmentCondition().isBlank()
                || request.completionNote().length() > 500
                || request.equipmentCondition().length() > 500) {
            throw SystemException.badRequest("MISSION_HANDOVER_NOTES_REQUIRED");
        }
        boolean needsResult =
                java.util.Set.of(
                                MissionType.AREA_INSPECTION,
                                MissionType.AERIAL_RECORDING,
                                MissionType.DATA_COLLECTION)
                        .contains(mission.getMissionType());
        if (needsResult
                && (missionMedia == null
                        || !missionMedia
                                .existsByMissionIdAndMediaRoleInAndMediaConfirmedTrueAndMediaDeletedFalse(
                                        id,
                                        java.util.List.of(MediaRole.OUTPUT, MediaRole.DOCUMENT)))) {
            throw SystemException.conflict("MISSION_HANDOVER_RESULT_REQUIRED");
        }
        MissionStatus old = mission.getStatus();
        resources.releaseResources(mission, authentication.getName());
        MissionOperations.complete(
                mission, request.completionNote().trim(), request.equipmentCondition().trim());
        billing.recordCompletion(mission);
        missionEvents.record(
                mission,
                MissionEventType.COMPLETED,
                authentication,
                old,
                mission.getStatus(),
                request.completionNote().trim());
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                "COMPLETED");
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse fail(
            Long id, MissionFailureRequest request, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        access.requireAssignedOperator(mission, authentication);
        MissionStatus old = mission.getStatus();
        resources.releaseResources(mission, authentication.getName());
        MissionOperations.fail(mission, request.failureReason(), request.notes());
        missionEvents.record(
                mission,
                MissionEventType.FAILED,
                authentication,
                old,
                mission.getStatus(),
                request.failureReason());
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                "FAILED");
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse acceptOperator(
            Long id, MissionAcceptanceRequest request, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        access.requireAssignedOperator(mission, authentication);
        if (mission.getStatus() != MissionStatus.CONFIRMED
                && mission.getStatus() != MissionStatus.RESOURCE_RESERVED
                && mission.getStatus() != MissionStatus.READY)
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        if (request == null || request.expectedVersion() == null || request.expectedVersion() < 0) {
            throw SystemException.badRequest("MISSION_ACCEPTANCE_VERSION_REQUIRED");
        }
        if (request.expectedVersion() != mission.getVersion() || mission.isOperatorAccepted()) {
            throw SystemException.conflict("MISSION_ACCEPTANCE_STALE");
        }
        MissionOperations.acceptOperator(mission);
        missionEvents.record(
                mission,
                MissionEventType.OPERATOR_ACCEPTED,
                authentication,
                mission.getStatus(),
                mission.getStatus(),
                "Operator accepted assignment");
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                "OPERATOR_ACCEPTED");
        missions.flush();
        return missionMapper.toResponse(mission);
    }

    @Override
    public void requireAcceptance(Mission mission) {
        if (!mission.isOperatorAccepted())
            throw SystemException.conflict("MISSION_ACCEPTANCE_REQUIRED");
    }

    @Override
    public MissionResponse reportOperatorConflict(
            Long id, String note, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        access.requireAssignedOperator(mission, authentication);
        if (note == null || note.isBlank() || note.length() > 500)
            throw new IllegalArgumentException(
                    "Ghi chú vướng mắc phải có nội dung và không vượt quá 500 ký tự.");
        MissionStatus old = mission.getStatus();
        MissionOperations.reportOperatorConflict(mission, note.trim());
        missionEvents.record(
                mission,
                MissionEventType.OPERATOR_CONFLICT,
                authentication,
                old,
                mission.getStatus(),
                note.trim());
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                "OPERATOR_CONFLICT");
        return missionMapper.toResponse(mission);
    }

    @Override
    public String nextCode(int year) {
        return String.format(java.util.Locale.ROOT, "MSN-%d-%06d", year, missions.nextCodeValue());
    }

    /** Stores the validated plan and moves the mission's map point to the centre of its flight area. */
    private static void applyFlightPlan(
            Mission mission, com.uav.platform.modules.mission.dto.request.FlightPlanRequest plan) {
        if (plan == null) return;
        var resolved = FlightPlanOperations.resolve(plan);
        mission.setFlightPlan(FlightPlanOperations.write(resolved));
        mission.setLatitude(java.math.BigDecimal.valueOf(resolved.centerLatitude()));
        mission.setLongitude(java.math.BigDecimal.valueOf(resolved.centerLongitude()));
    }
}
