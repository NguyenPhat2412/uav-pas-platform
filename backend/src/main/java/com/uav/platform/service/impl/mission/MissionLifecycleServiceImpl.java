package com.uav.platform.service.impl.mission;

import com.uav.platform.dto.request.airspace.AirspaceCheckRequest;
import com.uav.platform.dto.request.mission.*;
import com.uav.platform.dto.request.notification.CreateNotificationRequest;
import com.uav.platform.dto.response.airspace.AirspaceCheckResponse;
import com.uav.platform.dto.response.mission.*;
import com.uav.platform.dto.response.weather.WeatherAssessmentResponse;
import com.uav.platform.entity.media.MediaAsset;
import com.uav.platform.entity.mission.*;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.notification.NotificationType;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.enums.weather.FlightClearanceLevel;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.mission.MissionMapper;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionMediaRepository;
import com.uav.platform.repository.mission.MissionPreflightLogRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.mission.ServiceOfferingRepository;
import com.uav.platform.service.airspace.AirspaceService;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.mission.MissionBillingService;
import com.uav.platform.service.mission.MissionEventService;
import com.uav.platform.service.mission.MissionLifecycleService;
import com.uav.platform.service.mission.MissionResourceService;
import com.uav.platform.service.notification.NotificationService;
import com.uav.platform.service.weather.WeatherService;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Mission creation, editing, acceptance and terminal state transitions. */
@Service
@Transactional
public class MissionLifecycleServiceImpl implements MissionLifecycleService {
    private final MissionRepository missions;
    private final ServiceOfferingRepository services;
    private final AuditLogService audit;
    private final MissionEventRepository events;
    private final com.uav.platform.service.billing.QuotaService quotaService;
    private final MissionMediaRepository missionMedia;
    private final MissionAccessService access;
    private final MissionEventService missionEvents;
    private final MissionResourceService resources;
    private final MissionBillingService billing;
    private final MissionMapper missionMapper;

    /** Optional: without a weather module (or in focused tests) missions start as before. */
    private final ObjectProvider<WeatherService> weather;

    @Autowired(required = false)
    private ObjectProvider<AirspaceService> airspace;

    @Autowired(required = false)
    private ObjectProvider<MediaAssetRepository> mediaAssets;

    @Autowired(required = false)
    private ObjectProvider<NotificationService> notifications;

    @Autowired(required = false)
    private ObjectProvider<MissionPreflightLogRepository> preflightLogs;

    @org.springframework.beans.factory.annotation.Value(
            "${app.mission.preflight-signoff-required:false}")
    private boolean preflightSignoffRequired;

    public void setAirspace(ObjectProvider<AirspaceService> airspace) {
        this.airspace = airspace;
    }

    public void setMediaAssets(ObjectProvider<MediaAssetRepository> mediaAssets) {
        this.mediaAssets = mediaAssets;
    }

    public void setNotifications(ObjectProvider<NotificationService> notifications) {
        this.notifications = notifications;
    }

    public void setPreflightLogs(ObjectProvider<MissionPreflightLogRepository> preflightLogs) {
        this.preflightLogs = preflightLogs;
    }

    public void setPreflightSignoffRequired(boolean preflightSignoffRequired) {
        this.preflightSignoffRequired = preflightSignoffRequired;
    }

    public MissionLifecycleServiceImpl(
            MissionRepository missions,
            ServiceOfferingRepository services,
            AuditLogService audit,
            MissionEventRepository events,
            com.uav.platform.service.billing.QuotaService quotaService,
            MissionMediaRepository missionMedia,
            MissionAccessService access,
            MissionEventService missionEvents,
            MissionResourceService resources,
            MissionBillingService billing,
            MissionMapper missionMapper) {
        this(
                missions,
                services,
                audit,
                events,
                quotaService,
                missionMedia,
                access,
                missionEvents,
                resources,
                billing,
                missionMapper,
                null);
    }

    @Autowired
    public MissionLifecycleServiceImpl(
            MissionRepository missions,
            ServiceOfferingRepository services,
            AuditLogService audit,
            MissionEventRepository events,
            com.uav.platform.service.billing.QuotaService quotaService,
            MissionMediaRepository missionMedia,
            MissionAccessService access,
            MissionEventService missionEvents,
            MissionResourceService resources,
            MissionBillingService billing,
            MissionMapper missionMapper,
            ObjectProvider<WeatherService> weather) {
        this.missions = missions;
        this.services = services;
        this.audit = audit;
        this.events = events;
        this.quotaService = quotaService;
        this.missionMedia = missionMedia;
        this.access = access;
        this.missionEvents = missionEvents;
        this.resources = resources;
        this.billing = billing;
        this.missionMapper = missionMapper;
        this.weather = weather;
    }

    /** start() opens this many minutes before the scheduled start time (2 h by default). */
    @org.springframework.beans.factory.annotation.Value("${app.mission.start-lead-minutes:120}")
    private long startLeadMinutes = 120;

    @Override
    public MissionResponse create(MissionCreateRequest request, String actorUsername) {
        AppUser customer = access.user(actorUsername);
        MissionInputOperations.checkSchedule(request.startTime(), request.expectedEndTime());
        checkQuota(customer, request.startTime(), request.expectedEndTime(), null);
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
        AirspaceCheckResponse airspaceCheck =
                checkAirspace(
                        MissionPermitOperations.toCheckRequest(
                                request.flightPlan(),
                                mission.getLatitude(),
                                mission.getLongitude(),
                                mission.getStartTime(),
                                mission.getExpectedEndTime()));
        boolean needsPermit =
                (airspaceCheck != null && airspaceCheck.requiresPermit())
                        || (request.flightPlan() != null && request.flightPlan().permitSupport());
        MissionPermitOperations.updatePermitRequirement(mission, needsPermit, false);
        if (request.serviceId() != null) mission.setService(activeService(request.serviceId()));
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
    @Transactional(readOnly = true)
    public void validate(MissionCreateRequest request) {
        // Same checks as create, without saving: lets the form review step rely on the server
        // alone.
        MissionInputOperations.checkSchedule(request.startTime(), request.expectedEndTime());
        if (request.flightPlan() != null) FlightPlanOperations.resolve(request.flightPlan());
        checkAirspace(
                MissionPermitOperations.toCheckRequest(
                        request.flightPlan(),
                        request.latitude(),
                        request.longitude(),
                        request.startTime(),
                        request.expectedEndTime()));
        if (request.serviceId() != null) activeService(request.serviceId());
    }

    private ServiceOffering activeService(Long serviceId) {
        ServiceOffering service =
                services.findById(serviceId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound("UAV service not found")
                                                .at("serviceId"));
        if (!service.isActive())
            throw SystemException.conflict("UAV service is inactive").at("serviceId");
        return service;
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
        MissionInputOperations.checkSchedule(request.startTime(), request.expectedEndTime());
        if (mission.getStatus() == MissionStatus.DRAFT)
            checkQuota(
                    mission.getCustomer(),
                    request.startTime(),
                    request.expectedEndTime(),
                    mission.getId());
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
        if (request.flightPlan() != null) {
            applyFlightPlan(mission, request.flightPlan());
            AirspaceCheckResponse check =
                    checkAirspace(
                            MissionPermitOperations.toCheckRequest(
                                    request.flightPlan(),
                                    mission.getLatitude(),
                                    mission.getLongitude(),
                                    mission.getStartTime(),
                                    mission.getExpectedEndTime()));
            boolean needsPermit =
                    (check != null && check.requiresPermit())
                            || request.flightPlan().permitSupport();
            MissionPermitOperations.invalidateOnDraftEdit(mission, needsPermit);
        } else {
            FlightPlanResponse storedPlan = FlightPlanOperations.read(mission.getFlightPlan());
            AirspaceCheckResponse check =
                    checkAirspace(
                            MissionPermitOperations.toCheckRequest(
                                    storedPlan,
                                    mission.getLatitude(),
                                    mission.getLongitude(),
                                    mission.getStartTime(),
                                    mission.getExpectedEndTime()));
            boolean needsPermit =
                    (check != null && check.requiresPermit())
                            || (storedPlan != null && storedPlan.permitSupport());
            MissionPermitOperations.invalidateOnDraftEdit(mission, needsPermit);
        }
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
        if (old == MissionStatus.DRAFT) {
            // The schedule may have aged or other missions may have used the quota since the draft.
            MissionInputOperations.checkSchedule(
                    mission.getStartTime(), mission.getExpectedEndTime());
            checkQuota(
                    mission.getCustomer(),
                    mission.getStartTime(),
                    mission.getExpectedEndTime(),
                    mission.getId());
        }
        FlightPlanResponse storedPlan = FlightPlanOperations.read(mission.getFlightPlan());
        AirspaceCheckResponse airspaceCheck =
                checkAirspace(
                        MissionPermitOperations.toCheckRequest(
                                storedPlan,
                                mission.getLatitude(),
                                mission.getLongitude(),
                                mission.getStartTime(),
                                mission.getExpectedEndTime()));
        boolean needsPermit =
                (airspaceCheck != null && airspaceCheck.requiresPermit())
                        || (storedPlan != null && storedPlan.permitSupport());
        MissionPermitOperations.updatePermitRequirement(mission, needsPermit, false);
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

    /**
     * Planned hours of every open mission of the customer, plus hours already used, must fit the
     * quota. QuotaService locks the customer's quota (user row) so parallel bookings serialize.
     */
    private void checkQuota(
            AppUser customer,
            java.time.LocalDateTime start,
            java.time.LocalDateTime end,
            Long excludeMissionId) {
        if (quotaService == null || customer == null || customer.getId() == null) return;
        quotaService.checkCanSchedule(
                customer.getId(), billing.calculateDurationHours(start, end), excludeMissionId);
    }

    @Override
    public MissionResponse cancel(Long id, String reason, Authentication authentication) {
        String note = reason == null || reason.isBlank() ? null : reason.trim();
        if (note != null && note.length() > 500)
            throw SystemException.badRequest(
                            "Lý do hủy không được vượt quá 500 ký tự.",
                            "MISSION_CANCEL_REASON_TOO_LONG")
                    .at("reason");
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
                note == null ? "Mission cancelled" : note);
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
        fallbackNotifyCustomer(
                mission,
                authentication,
                "Mission " + missionLabel(mission),
                "Mission confirmed",
                "MISSION");
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
        fallbackNotifyCustomer(
                mission,
                authentication,
                "Mission " + missionLabel(mission),
                reason == null || reason.isBlank() ? "Mission rejected" : reason,
                "MISSION");
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
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        requireStartWindow(mission, now);
        resources.validatePreflightResources(mission);
        requireAcceptance(mission);
        requirePreflightClearance(mission);
        FlightPlanResponse storedPlan = FlightPlanOperations.read(mission.getFlightPlan());
        long plannedMinutes =
                mission.getStartTime() != null && mission.getExpectedEndTime() != null
                        ? Math.max(
                                30L,
                                java.time.Duration.between(
                                                mission.getStartTime(),
                                                mission.getExpectedEndTime())
                                        .toMinutes())
                        : 60L;
        java.time.LocalDateTime effectiveStart =
                mission.getStartTime() != null && mission.getStartTime().isBefore(now)
                        ? mission.getStartTime()
                        : now;
        java.time.LocalDateTime actualEnd = now.plusMinutes(plannedMinutes);
        java.time.LocalDateTime effectiveEnd =
                mission.getExpectedEndTime() != null
                                && mission.getExpectedEndTime().isAfter(actualEnd)
                        ? mission.getExpectedEndTime()
                        : actualEnd;
        AirspaceCheckResponse airspaceCheck =
                checkAirspace(
                        MissionPermitOperations.toCheckRequest(
                                storedPlan,
                                mission.getLatitude(),
                                mission.getLongitude(),
                                effectiveStart,
                                effectiveEnd));
        boolean airspaceRequiresPermit =
                (airspaceCheck != null && airspaceCheck.requiresPermit())
                        || (storedPlan != null && storedPlan.permitSupport());
        MissionPermitOperations.enforcePreflightPermit(mission, airspaceRequiresPermit, now);
        String weatherNote = preflightWeather(mission);
        MissionStatus old = mission.getStatus();
        MissionOperations.transitionTo(mission, MissionStatus.IN_PROGRESS);
        resources.changeUavStatus(
                mission.getUav(), UavStatus.IN_USE, "Mission started", authentication.getName());
        String startDetail =
                weatherNote == null ? "Mission started" : "Mission started · " + weatherNote;
        missionEvents.record(
                mission,
                MissionEventType.STATUS_CHANGED,
                authentication,
                old,
                mission.getStatus(),
                startDetail);
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                "IN_PROGRESS");
        fallbackNotifyCustomer(
                mission,
                authentication,
                "Mission " + missionLabel(mission),
                startDetail,
                "MISSION");
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
        fallbackNotifyCustomer(
                mission,
                authentication,
                "Mission " + missionLabel(mission),
                request.completionNote().trim(),
                "MISSION");
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
        fallbackNotifyCustomer(
                mission,
                authentication,
                "Mission " + missionLabel(mission),
                request.failureReason(),
                "MISSION");
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse forceFail(
            Long id, MissionForceFailRequest request, Authentication authentication) {
        if (request == null
                || request.reason() == null
                || request.reason().isBlank()
                || request.reason().trim().length() > 500)
            throw SystemException.badRequest(
                            "Phải nêu lý do (tối đa 500 ký tự) khi buộc kết thúc nhiệm vụ.",
                            "MISSION_FORCE_FAIL_REASON_REQUIRED")
                    .at("reason");
        if (request.notes() != null && request.notes().length() > 2000)
            throw SystemException.badRequest(
                            "Ghi chú không được vượt quá 2000 ký tự.", "MISSION_NOTES_TOO_LONG")
                    .at("notes");
        Mission mission = access.accessibleForUpdate(id, authentication);
        MissionStatus old = mission.getStatus();
        if (old != MissionStatus.IN_PROGRESS
                && old != MissionStatus.READY
                && old != MissionStatus.RESOURCE_RESERVED)
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        String reason = request.reason().trim();
        resources.releaseResources(mission, authentication.getName());
        MissionOperations.fail(mission, reason, request.notes());
        String note = "[Buộc kết thúc] " + reason;
        missionEvents.record(
                mission,
                MissionEventType.FAILED,
                authentication,
                old,
                mission.getStatus(),
                note.length() > 500 ? note.substring(0, 500) : note);
        String operator = mission.getOperator() == null ? "-" : mission.getOperator().getUsername();
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                "FORCE_FAILED from " + old + " (operator " + operator + "): " + reason);
        return missionMapper.toResponse(mission);
    }

    /** The operator may start from startLeadMinutes before the scheduled start onwards. */
    protected void requireStartWindow(Mission mission, java.time.LocalDateTime now) {
        if (mission.getStartTime() != null
                && now.isBefore(mission.getStartTime().minusMinutes(startLeadMinutes)))
            throw SystemException.conflict(
                    String.format(
                            java.util.Locale.ROOT,
                            "Chỉ có thể bắt đầu nhiệm vụ từ %d phút trước giờ bắt đầu dự kiến.",
                            startLeadMinutes),
                    "MISSION_START_TOO_EARLY");
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

    private void requirePreflightClearance(Mission mission) {
        MissionPreflightLogRepository repo =
                preflightLogs == null ? null : preflightLogs.getIfAvailable();
        if (repo == null || mission.getId() == null) {
            if (preflightSignoffRequired) {
                throw SystemException.conflict(
                        "Nhiệm vụ phải hoàn tất biên bản kiểm tra an toàn tiền bay trước khi cất cánh.",
                        "MISSION_PREFLIGHT_NOT_CLEARED");
            }
            return;
        }
        java.util.Optional<MissionPreflightLog> existing = repo.findByMissionId(mission.getId());
        if (existing.isPresent() && !existing.get().isClearedForTakeoff()) {
            throw SystemException.conflict(
                    "Biên bản tiền bay chưa đạt đủ điều kiện an toàn để cất cánh hoặc cần ký lại sau khi thay đổi thiết bị.",
                    "MISSION_PREFLIGHT_NOT_CLEARED");
        }
        if (existing.isEmpty() && preflightSignoffRequired) {
            throw SystemException.conflict(
                    "Nhiệm vụ phải hoàn tất biên bản kiểm tra an toàn tiền bay trước khi cất cánh.",
                    "MISSION_PREFLIGHT_NOT_CLEARED");
        }
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
    public MissionResponse upsertPermit(
            Long id, MissionPermitUpsertRequest request, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        access.requirePermitEditor(mission, authentication);
        if (request.permitMediaId() != null) {
            validatePermitMedia(mission, request.permitMediaId(), authentication);
        }
        MissionPermitOperations.applyUpsert(mission, request);
        missionEvents.record(
                mission,
                MissionEventType.PERMIT_SUBMITTED,
                authentication,
                mission.getStatus(),
                mission.getStatus(),
                "Flight permit submitted: " + mission.getPermitNumber());
        audit.record(
                null,
                authentication.getName(),
                AuditAction.UPDATE,
                "MISSION",
                id.toString(),
                "PERMIT_SUBMITTED:" + mission.getPermitNumber());
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse verifyPermit(
            Long id, MissionPermitVerifyRequest request, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        access.requirePermitVerifier(authentication);
        MissionPermitOperations.applyVerification(mission, request, authentication.getName());
        boolean approved = mission.getPermitStatus() == FlightPermitStatus.VERIFIED;
        MissionEventType eventType =
                approved ? MissionEventType.PERMIT_VERIFIED : MissionEventType.PERMIT_REJECTED;
        String detail =
                approved
                        ? "Giấy phép bay " + mission.getPermitNumber() + " đã được xác minh hợp lệ."
                        : "Giấy phép bay "
                                + mission.getPermitNumber()
                                + " bị từ chối thẩm định"
                                + (mission.getPermitNote() != null
                                        ? ": " + mission.getPermitNote()
                                        : ".");
        missionEvents.record(
                mission,
                eventType,
                authentication,
                mission.getStatus(),
                mission.getStatus(),
                detail);
        audit.record(
                null,
                authentication.getName(),
                AuditAction.STATUS_CHANGE,
                "MISSION",
                id.toString(),
                mission.getPermitStatus() + ":" + mission.getPermitNumber());
        fallbackNotifyCustomer(
                mission,
                authentication,
                approved ? "Giấy phép bay đã được phê duyệt" : "Giấy phép bay bị từ chối",
                detail,
                "PERMIT");
        return missionMapper.toResponse(mission);
    }

    private AirspaceCheckResponse checkAirspace(AirspaceCheckRequest checkRequest) {
        if (checkRequest == null) return null;
        AirspaceService service = airspace == null ? null : airspace.getIfAvailable();
        if (service == null) return null;
        AirspaceCheckResponse result = service.check(checkRequest);
        MissionPermitOperations.rejectIfBlocked(result);
        return result;
    }

    private void validatePermitMedia(
            Mission mission, Long permitMediaId, Authentication authentication) {
        MediaAssetRepository repo = mediaAssets == null ? null : mediaAssets.getIfAvailable();
        if (repo == null) return;
        MediaAsset asset =
                repo.findById(permitMediaId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                        "Tệp đính kèm giấy phép không tồn tại.",
                                                        "PERMIT_MEDIA_NOT_FOUND")
                                                .at("permitMediaId"));
        String missionIdStr = mission.getId() == null ? null : mission.getId().toString();
        String actorName = authentication == null ? null : authentication.getName();
        boolean linkedToMission =
                "MISSION".equals(asset.getLinkedEntityType())
                        && missionIdStr != null
                        && missionIdStr.equals(asset.getLinkedEntityId());
        boolean unlinkedAndAuthorized =
                asset.getLinkedEntityType() == null
                        && ((actorName != null
                                        && java.util.Objects.equals(
                                                asset.getUploadedBy(), actorName))
                                || access.hasAuthority(authentication, "MISSION_CONFIRM"));
        if (!linkedToMission && !unlinkedAndAuthorized) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Not authorized to attach this media asset to mission permit");
        }
        if (asset.isDeleted() || !asset.isConfirmed()) {
            throw SystemException.conflict(
                            "Tệp đính kèm giấy phép chưa được xác nhận tải lên hoặc đã bị xóa.",
                            "PERMIT_MEDIA_NOT_CONFIRMED")
                    .at("permitMediaId");
        }
        if (unlinkedAndAuthorized && missionIdStr != null) {
            asset.setLinkedEntityType("MISSION");
            asset.setLinkedEntityId(missionIdStr);
            repo.save(asset);
        }
    }

    private void fallbackNotifyCustomer(
            Mission mission,
            Authentication actor,
            String title,
            String content,
            String referenceType) {
        if (missionEvents != null && missionEvents.deliversNotifications()) return;
        NotificationService service = notifications == null ? null : notifications.getIfAvailable();
        AppUser customer = mission == null ? null : mission.getCustomer();
        String actorName = actor == null ? null : actor.getName();
        if (service == null
                || customer == null
                || customer.getId() == null
                || customer.getUsername().equals(actorName)) return;
        try {
            service.sendNotification(
                    new CreateNotificationRequest(
                            customer.getId(),
                            title,
                            content == null || content.isBlank() ? title : content,
                            NotificationType.MISSION_STATUS_CHANGED,
                            referenceType,
                            mission.getId()));
        } catch (RuntimeException ignored) {
        }
    }

    private static String missionLabel(Mission mission) {
        return mission.getCode() != null ? mission.getCode() : String.valueOf(mission.getId());
    }

    @Override
    public String nextCode(int year) {
        return String.format(java.util.Locale.ROOT, "MSN-%d-%06d", year, missions.nextCodeValue());
    }

    /** Stores the validated plan and moves the mission's map point to the centre of its flight area. */
    private static void applyFlightPlan(
            Mission mission, com.uav.platform.dto.request.mission.FlightPlanRequest plan) {
        if (plan == null) return;
        var resolved = FlightPlanOperations.resolve(plan);
        mission.setFlightPlan(FlightPlanOperations.write(resolved));
        mission.setLatitude(java.math.BigDecimal.valueOf(resolved.centerLatitude()));
        mission.setLongitude(java.math.BigDecimal.valueOf(resolved.centerLongitude()));
    }

    /**
     * Weather at the site right now. NO_GO stops the start only when an administrator enabled the
     * preflight block; otherwise the verdict is recorded in the start event. A weather failure never
     * blocks a start.
     */
    private String preflightWeather(Mission mission) {
        WeatherService service = weather == null ? null : weather.getIfAvailable();
        if (service == null || mission.getLatitude() == null || mission.getLongitude() == null)
            return null;
        WeatherAssessmentResponse assessment;
        boolean block;
        try {
            Double serviceMaxWind =
                    mission.getService() == null ? null : mission.getService().getMaxWindMs();
            assessment =
                    service.assess(
                            mission.getLatitude().doubleValue(),
                            mission.getLongitude().doubleValue(),
                            null,
                            serviceMaxWind);
            block = service.preflightBlockEnabled();
        } catch (RuntimeException ex) {
            return null;
        }
        if (assessment.clearance() == FlightClearanceLevel.NO_GO && block)
            throw SystemException.conflict("MISSION_WEATHER_UNSAFE");
        return assessment.windSpeed80mMs() == null
                ? "weather " + assessment.clearance()
                : String.format(
                        java.util.Locale.ROOT,
                        "weather %s, wind 80 m %.1f m/s",
                        assessment.clearance(),
                        assessment.windSpeed80mMs());
    }
}
