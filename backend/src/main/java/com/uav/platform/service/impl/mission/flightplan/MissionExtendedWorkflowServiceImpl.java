package com.uav.platform.service.impl.mission.flightplan;

import com.uav.platform.dao.inventory.IEquipmentDao;
import com.uav.platform.dao.maintenance.IRepairOrderDao;
import com.uav.platform.dao.mission.IMissionDao;
import com.uav.platform.dao.mission.IMissionEquipmentReservationDao;
import com.uav.platform.dao.mission.IMissionEventDao;
import com.uav.platform.dao.mission.IMissionPreflightLogDao;
import com.uav.platform.dao.mission.IMissionReviewDao;
import com.uav.platform.dao.station.IStationDao;
import com.uav.platform.dao.uav.IUavDao;
import com.uav.platform.dao.uav.IUavTelemetryDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.request.mission.dispatch.ResourceAssignmentRequest;
import com.uav.platform.dto.request.mission.flightplan.MissionPreflightUpsertRequest;
import com.uav.platform.dto.request.mission.flightplan.MissionReviewUpsertRequest;
import com.uav.platform.dto.request.notification.inbox.CreateNotificationRequest;
import com.uav.platform.dto.response.airspace.AirspaceCheckResponse;
import com.uav.platform.dto.response.mission.dispatch.MissionDispatchCandidatesResponse;
import com.uav.platform.dto.response.mission.flightplan.FlightPlanResponse;
import com.uav.platform.dto.response.mission.flightplan.MissionInspectionReportResponse;
import com.uav.platform.dto.response.mission.flightplan.MissionMediaResponse;
import com.uav.platform.dto.response.mission.flightplan.MissionPreflightResponse;
import com.uav.platform.dto.response.mission.flightplan.MissionReviewResponse;
import com.uav.platform.dto.response.mission.flightplan.OperatorLogbookResponse;
import com.uav.platform.dto.response.mission.flightplan.OperatorLogbookResponse.LoggedFlightEntry;
import com.uav.platform.dto.response.mission.lifecycle.MissionResponse;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.mission.MissionEquipmentReservation;
import com.uav.platform.entity.mission.MissionEvent;
import com.uav.platform.entity.mission.MissionPreflightLog;
import com.uav.platform.entity.mission.MissionReview;
import com.uav.platform.entity.station.Station;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.uav.UavTelemetry;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.maintenance.RepairStatus;
import com.uav.platform.enums.mission.MissionEventType;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.notification.NotificationType;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.mission.lifecycle.MissionMapper;
import com.uav.platform.service.airspace.AirspaceService;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.billing.quota.QuotaService;
import com.uav.platform.service.impl.mission.dispatch.MissionSmartDispatchOperations;
import com.uav.platform.service.impl.mission.lifecycle.MissionInputOperations;
import com.uav.platform.service.impl.mission.lifecycle.MissionOperations;
import com.uav.platform.service.mission.dispatch.MissionDispatchService;
import com.uav.platform.service.mission.dispatch.MissionResourceService;
import com.uav.platform.service.mission.flightplan.MissionExtendedWorkflowService;
import com.uav.platform.service.mission.lifecycle.MissionAccessService;
import com.uav.platform.service.mission.lifecycle.MissionBillingService;
import com.uav.platform.service.mission.lifecycle.MissionLifecycleService;
import com.uav.platform.service.notification.inbox.NotificationService;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.specification.mission.lifecycle.MissionSpecifications;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@Transactional
public class MissionExtendedWorkflowServiceImpl implements MissionExtendedWorkflowService {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private static final Set<MissionStatus> PREFLIGHT_ALLOWED_STATUSES =
            Set.of(
                    MissionStatus.CONFIRMED,
                    MissionStatus.RESOURCE_RESERVED,
                    MissionStatus.READY,
                    MissionStatus.IN_PROGRESS);

    private static final Set<RepairStatus> ACTIVE_REPAIR_STATUSES =
            Set.of(RepairStatus.OPEN, RepairStatus.IN_PROGRESS);

    private static final String CLONE_SUFFIX = " (Bản sao)";

    private final IMissionDao missions;
    private final IMissionEventDao events;
    private final IMissionReviewDao reviews;
    private final IMissionPreflightLogDao preflightLogs;
    private final IMissionEquipmentReservationDao reservations;
    private final IStationDao stations;
    private final IUavDao uavs;
    private final IUavTelemetryDao telemetry;
    private final IEquipmentDao equipmentRepository;
    private final IUserDao users;
    private final MissionAccessService access;
    private final MissionLifecycleService lifecycle;
    private final MissionDispatchService dispatch;
    private final MissionResourceService resources;
    private final MissionBillingService billing;
    private final QuotaService quotaService;
    private final AuditLogService audit;
    private final MissionMapper missionMapper;
    private final PermissionService permissionService;
    private final ObjectProvider<AirspaceService> airspace;
    private final ObjectProvider<NotificationService> notifications;
    private final IRepairOrderDao repairOrders;

    @Autowired(required = false)
    private com.uav.platform.service.marketplace.escrow.MarketplaceEscrowService marketplaceEscrow;

    @Autowired(required = false)
    private com.uav.platform.transport.websocket.RealtimeEventBroadcaster realtime;

    public MissionExtendedWorkflowServiceImpl(
            IMissionDao missions,
            IMissionEventDao events,
            IMissionReviewDao reviews,
            IMissionPreflightLogDao preflightLogs,
            IMissionEquipmentReservationDao reservations,
            IStationDao stations,
            IUavDao uavs,
            IUavTelemetryDao telemetry,
            IEquipmentDao equipmentRepository,
            IUserDao users,
            MissionAccessService access,
            MissionLifecycleService lifecycle,
            MissionDispatchService dispatch,
            MissionResourceService resources,
            MissionBillingService billing,
            QuotaService quotaService,
            AuditLogService audit,
            MissionMapper missionMapper,
            PermissionService permissionService,
            ObjectProvider<AirspaceService> airspace,
            ObjectProvider<NotificationService> notifications) {
        this(
                missions,
                events,
                reviews,
                preflightLogs,
                reservations,
                stations,
                uavs,
                telemetry,
                equipmentRepository,
                users,
                access,
                lifecycle,
                dispatch,
                resources,
                billing,
                quotaService,
                audit,
                missionMapper,
                permissionService,
                airspace,
                notifications,
                null);
    }

    @Autowired
    public MissionExtendedWorkflowServiceImpl(
            IMissionDao missions,
            IMissionEventDao events,
            IMissionReviewDao reviews,
            IMissionPreflightLogDao preflightLogs,
            IMissionEquipmentReservationDao reservations,
            IStationDao stations,
            IUavDao uavs,
            IUavTelemetryDao telemetry,
            IEquipmentDao equipmentRepository,
            IUserDao users,
            MissionAccessService access,
            MissionLifecycleService lifecycle,
            MissionDispatchService dispatch,
            MissionResourceService resources,
            MissionBillingService billing,
            QuotaService quotaService,
            AuditLogService audit,
            MissionMapper missionMapper,
            PermissionService permissionService,
            ObjectProvider<AirspaceService> airspace,
            ObjectProvider<NotificationService> notifications,
            IRepairOrderDao repairOrders) {
        this.missions = missions;
        this.events = events;
        this.reviews = reviews;
        this.preflightLogs = preflightLogs;
        this.reservations = reservations;
        this.stations = stations;
        this.uavs = uavs;
        this.telemetry = telemetry;
        this.equipmentRepository = equipmentRepository;
        this.users = users;
        this.access = access;
        this.lifecycle = lifecycle;
        this.dispatch = dispatch;
        this.resources = resources;
        this.billing = billing;
        this.quotaService = quotaService;
        this.audit = audit;
        this.missionMapper = missionMapper;
        this.permissionService = permissionService;
        this.airspace = airspace;
        this.notifications = notifications;
        this.repairOrders = repairOrders;
    }

    @Override
    public MissionResponse cloneMission(Long id, Authentication authentication) {
        Mission source = access.accessible(id, authentication);
        AppUser actor = access.user(authentication.getName());
        AppUser targetCustomer =
                access.hasAuthority(authentication, "MISSION_VIEW_ALL")
                                && source.getCustomer() != null
                        ? source.getCustomer()
                        : actor;

        long rawMinutes =
                source.getStartTime() != null && source.getExpectedEndTime() != null
                        ? Duration.between(source.getStartTime(), source.getExpectedEndTime())
                                .toMinutes()
                        : 60L;
        long durationMinutes = Math.max(30L, Math.min(1440L, rawMinutes));

        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        LocalTime preferredStart =
                source.getStartTime() != null
                        ? source.getStartTime().toLocalTime().withSecond(0).withNano(0)
                        : LocalTime.of(9, 0);
        LocalDateTime nextStart = LocalDate.now().plusDays(1).atTime(preferredStart);
        if (nextStart.isBefore(now.plusHours(2))) {
            nextStart = now.plusHours(2);
        }
        LocalDateTime nextEnd = nextStart.plusMinutes(durationMinutes);
        MissionInputOperations.checkSchedule(nextStart, nextEnd, now);

        if (quotaService != null && targetCustomer.getId() != null) {
            quotaService.checkCanSchedule(
                    targetCustomer.getId(),
                    billing.calculateDurationHours(nextStart, nextEnd),
                    null);
        }

        String baseTitle =
                source.getTitle() == null ? "Nhiệm vụ khảo sát" : source.getTitle().trim();
        if (baseTitle.endsWith(CLONE_SUFFIX)) {
            baseTitle = baseTitle.substring(0, baseTitle.length() - CLONE_SUFFIX.length()).trim();
        }
        int maxBaseLen = 180 - CLONE_SUFFIX.length();
        String clonedTitle =
                (baseTitle.length() > maxBaseLen ? baseTitle.substring(0, maxBaseLen) : baseTitle)
                        + CLONE_SUFFIX;

        String clonedLocation =
                source.getLocationName() == null || source.getLocationName().isBlank()
                        ? "Chưa xác định địa điểm"
                        : source.getLocationName().trim();

        Mission draft =
                MissionOperations.draft(
                        targetCustomer,
                        source.getMissionType() == null
                                ? com.uav.platform.enums.mission.MissionType.AREA_INSPECTION
                                : source.getMissionType(),
                        clonedTitle,
                        source.getDescription(),
                        nextStart.toLocalDate(),
                        nextStart,
                        nextEnd,
                        clonedLocation,
                        source.getLatitude(),
                        source.getLongitude(),
                        source.getPriority(),
                        source.getNotes());
        draft.setCode(lifecycle.nextCode(nextStart.getYear()));
        draft.setFlightPlan(source.getFlightPlan());
        if (source.getService() != null && source.getService().isActive()) {
            draft.setService(source.getService());
        }

        FlightPlanResponse storedPlan = FlightPlanOperations.read(draft.getFlightPlan());
        AirspaceService airspaceService = airspace == null ? null : airspace.getIfAvailable();
        AirspaceCheckResponse check = null;
        if (airspaceService != null) {
            var checkReq =
                    MissionPermitOperations.toCheckRequest(
                            storedPlan,
                            draft.getLatitude(),
                            draft.getLongitude(),
                            nextStart,
                            nextEnd);
            if (checkReq != null) {
                check = airspaceService.check(checkReq);
                MissionPermitOperations.rejectIfBlocked(check);
            }
        }
        boolean needsPermit =
                (check != null && check.requiresPermit())
                        || (storedPlan != null && storedPlan.permitSupport());
        MissionPermitOperations.updatePermitRequirement(draft, needsPermit, false);

        Mission saved = missions.save(draft);
        Map<String, Object> metaPayload = new LinkedHashMap<>();
        metaPayload.put("sourceMissionId", source.getId());
        metaPayload.put("sourceCode", source.getCode());
        String metadata = JSON.writeValueAsString(metaPayload);
        events.save(
                new MissionEvent(
                        saved,
                        MissionEventType.CLONED,
                        actor,
                        null,
                        MissionStatus.DRAFT,
                        "Cloned from " + source.getCode(),
                        metadata));
        if (audit != null) {
            audit.record(
                    actor.getId(),
                    actor.getUsername(),
                    AuditAction.CREATE,
                    "MISSION",
                    saved.getId().toString(),
                    saved.getCode() + "<-" + source.getCode());
        }
        return missionMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionReviewResponse getReview(Long id, Authentication authentication) {
        Mission mission = access.accessible(id, authentication);
        return reviews.findByMissionId(id)
                .map(review -> toReviewResponse(review, mission))
                .orElseGet(
                        () ->
                                new MissionReviewResponse(
                                        false,
                                        null,
                                        mission.getId(),
                                        mission.getCode(),
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        false,
                                        null,
                                        null,
                                        null));
    }

    @Override
    public MissionReviewResponse upsertReview(
            Long id, MissionReviewUpsertRequest request, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        String actorUsername = authentication == null ? null : authentication.getName();
        boolean isOwner =
                mission.getCustomer() != null
                        && Objects.equals(mission.getCustomer().getUsername(), actorUsername);
        if (!isOwner && !access.hasAuthority(authentication, "USER_MANAGE")) {
            throw new AccessDeniedException(
                    "Only the mission customer or an administrator can sign off deliverables");
        }
        if (mission.getStatus() != MissionStatus.COMPLETED) {
            throw SystemException.conflict(
                    "Chỉ nhiệm vụ đã hoàn thành mới có thể nghiệm thu bàn giao và đánh giá.",
                    "MISSION_REVIEW_REQUIRES_COMPLETED");
        }

        AppUser actor = access.user(actorUsername);
        AppUser reviewCustomer = mission.getCustomer() != null ? mission.getCustomer() : actor;
        MissionReview review =
                reviews.findByMissionId(id)
                        .orElseGet(
                                () -> {
                                    MissionReview created = new MissionReview();
                                    created.setMission(mission);
                                    created.setCustomer(reviewCustomer);
                                    return created;
                                });
        if (review.getCustomer() == null) {
            review.setCustomer(reviewCustomer);
        }
        boolean accepted = request.deliverablesAccepted() == null || request.deliverablesAccepted();
        if (!accepted
                && marketplaceEscrow != null
                && marketplaceEscrow.hasReleasedEscrow(mission.getId())) {
            throw SystemException.conflict(
                    "Khoản tạm giữ (Escrow) đã được giải ngân cho đối tác nên không thể thu hồi xác nhận nghiệm thu.",
                    "ESCROW_ALREADY_RELEASED");
        }
        Integer effectiveOverall = request.effectiveOverallRating();
        if (effectiveOverall == null) {
            throw SystemException.badRequest(
                            "Chọn mức đánh giá từ 1 đến 5 sao.", "VALIDATION_ERROR")
                    .at("overallRating");
        }
        boolean creating = review.getId() == null;
        review.setOverallRating(effectiveOverall);
        review.setDataQualityRating(request.effectiveDataQualityRating());
        review.setTimelinessRating(request.effectiveTimelinessRating());
        review.setDeliverablesAccepted(accepted);
        review.setComment(
                request.comment() == null || request.comment().isBlank()
                        ? null
                        : request.comment().trim());

        MissionReview saved = reviews.save(review);
        if (marketplaceEscrow != null) {
            marketplaceEscrow.onMissionReviewed(mission.getId());
        }
        if (realtime != null) {
            realtime.publishOrderUpdated(
                    mission.getId(),
                    mission.getStatus().name(),
                    com.uav.platform.common.util.OrderStatusGroups.DELIVERED,
                    mission.getCustomer() != null ? mission.getCustomer().getId() : null,
                    mission.getProvider() != null && mission.getProvider().getUser() != null
                            ? mission.getProvider().getUser().getId()
                            : null,
                    mission.getOperator() != null ? mission.getOperator().getId() : null);
        }
        events.save(
                new MissionEvent(
                        mission,
                        MissionEventType.HANDOVER_REVIEWED,
                        actor,
                        mission.getStatus(),
                        mission.getStatus(),
                        "Customer handover rated " + saved.getOverallRating() + "/5",
                        null));
        if (audit != null) {
            audit.record(
                    actor.getId(),
                    actor.getUsername(),
                    creating ? AuditAction.CREATE : AuditAction.UPDATE,
                    "MISSION_REVIEW",
                    mission.getId().toString(),
                    mission.getCode() + ":" + saved.getOverallRating() + "stars");
        }
        notifyOperatorOfReview(mission, saved);
        return toReviewResponse(saved, mission);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionPreflightResponse getPreflight(Long id, Authentication authentication) {
        Mission mission = access.accessible(id, authentication);
        return preflightLogs
                .findByMissionId(id)
                .map(MissionExtendedWorkflowServiceImpl::toPreflightResponse)
                .orElseGet(
                        () ->
                                new MissionPreflightResponse(
                                        false,
                                        null,
                                        mission.getId(),
                                        null,
                                        null,
                                        false,
                                        false,
                                        false,
                                        false,
                                        false,
                                        null,
                                        null,
                                        null,
                                        false,
                                        null,
                                        null));
    }

    @Override
    public MissionPreflightResponse upsertPreflight(
            Long id, MissionPreflightUpsertRequest request, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        String actorUsername = authentication == null ? null : authentication.getName();
        boolean isAssignedOperator =
                mission.getOperator() != null
                        && Objects.equals(mission.getOperator().getUsername(), actorUsername);
        if (!isAssignedOperator && !access.hasAuthority(authentication, "MISSION_CONFIRM")) {
            throw new AccessDeniedException(
                    "Only the assigned operator or commander can sign the pre-flight checklist");
        }
        if (!PREFLIGHT_ALLOWED_STATUSES.contains(mission.getStatus())) {
            throw SystemException.conflict(
                    "Trạng thái nhiệm vụ hiện tại không cho phép ký biên bản tiền bay.",
                    "MISSION_PREFLIGHT_INVALID_STATUS");
        }

        AppUser signer = access.user(actorUsername);
        boolean cleared =
                request.airframeAndPropellersSafe()
                        && request.batteryHealthy()
                        && request.gnssRtkLocked()
                        && request.weatherWithinLimits()
                        && request.airspaceAndPermitCleared()
                        && (request.measuredBatteryPct() == null
                                || request.measuredBatteryPct() >= 25)
                        && (request.satelliteCount() == null || request.satelliteCount() >= 6)
                        && (request.measuredWindMs() == null || request.measuredWindMs() <= 15.0);

        MissionPreflightLog log =
                preflightLogs
                        .findByMissionId(id)
                        .orElseGet(
                                () -> {
                                    MissionPreflightLog created = new MissionPreflightLog();
                                    created.setMission(mission);
                                    return created;
                                });
        boolean creating = log.getId() == null;
        log.setSignedBy(signer);
        log.setSignedByUsername(signer.getUsername());
        log.setSignedAt(LocalDateTime.now());
        log.setAirframeAndPropellersSafe(request.airframeAndPropellersSafe());
        log.setBatteryHealthy(request.batteryHealthy());
        log.setGnssRtkLocked(request.gnssRtkLocked());
        log.setWeatherWithinLimits(request.weatherWithinLimits());
        log.setAirspaceAndPermitCleared(request.airspaceAndPermitCleared());
        log.setMeasuredBatteryPct(request.measuredBatteryPct());
        log.setSatelliteCount(request.satelliteCount());
        log.setMeasuredWindMs(request.measuredWindMs());
        log.setClearedForTakeoff(cleared);
        log.setNotes(
                request.notes() == null || request.notes().isBlank()
                        ? null
                        : request.notes().trim());

        MissionPreflightLog saved = preflightLogs.save(log);
        events.save(
                new MissionEvent(
                        mission,
                        MissionEventType.PREFLIGHT_SIGNED,
                        signer,
                        mission.getStatus(),
                        mission.getStatus(),
                        cleared
                                ? "Pre-flight safety checklist cleared for takeoff"
                                : "Pre-flight safety checklist updated (pending clearance)",
                        null));
        if (audit != null) {
            audit.record(
                    signer.getId(),
                    signer.getUsername(),
                    creating ? AuditAction.CREATE : AuditAction.UPDATE,
                    "MISSION_PREFLIGHT",
                    mission.getId().toString(),
                    mission.getCode() + ":cleared=" + cleared);
        }
        return toPreflightResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public OperatorLogbookResponse operatorLogbook(Long operatorId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw SystemException.unauthorized("Vui lòng đăng nhập để tiếp tục.");
        }
        AppUser caller = access.user(authentication.getName());
        AppUser target = caller;
        if (operatorId != null && !Objects.equals(operatorId, caller.getId())) {
            if (!access.hasAuthority(authentication, "MISSION_VIEW_ALL")) {
                throw new AccessDeniedException(
                        "Viewing another operator's logbook requires MISSION_VIEW_ALL");
            }
            target =
                    users.findById(operatorId)
                            .orElseThrow(
                                    () ->
                                            SystemException.notFound(
                                                    "Không tìm thấy thông tin người vận hành."));
        }

        List<Mission> operatorMissions =
                missions.findAll(
                        MissionSpecifications.hasOperator(target.getId()),
                        Sort.by(Sort.Direction.DESC, "startTime"));

        List<Long> missionIds =
                operatorMissions.stream().map(Mission::getId).filter(Objects::nonNull).toList();
        Map<Long, Boolean> preflightClearedByMission = new HashMap<>();
        if (!missionIds.isEmpty()) {
            List<MissionPreflightLog> logs = preflightLogs.findByMissionIdIn(missionIds);
            if (logs != null) {
                for (MissionPreflightLog p : logs) {
                    if (p != null && p.getMission() != null && p.getMission().getId() != null) {
                        preflightClearedByMission.put(
                                p.getMission().getId(), p.isClearedForTakeoff());
                    }
                }
            }
        }
        Map<Long, Integer> ratingByMission = new HashMap<>();
        if (!missionIds.isEmpty()) {
            List<MissionReview> missionReviews = reviews.findByMissionIdIn(missionIds);
            if (missionReviews != null) {
                for (MissionReview r : missionReviews) {
                    if (r != null
                            && r.getMission() != null
                            && r.getMission().getId() != null
                            && r.getOverallRating() != null) {
                        ratingByMission.put(r.getMission().getId(), r.getOverallRating());
                    }
                }
            }
        }

        long totalAssigned = operatorMissions.size();
        long completedCount = 0;
        double totalHours = 0.0;
        long preflightSigned = 0;
        long flownOrActiveCount = 0;
        long ratingSum = 0;
        long reviewCount = 0;

        List<LoggedFlightEntry> recentEntries = new ArrayList<>();
        for (Mission m : operatorMissions) {
            double hours = durationHours(m);
            boolean isCompleted = m.getStatus() == MissionStatus.COMPLETED;
            boolean isFlownOrActive = isCompleted || m.getStatus() == MissionStatus.IN_PROGRESS;
            if (isCompleted) {
                completedCount++;
                totalHours += hours;
            }
            if (isFlownOrActive) {
                flownOrActiveCount++;
            }

            boolean preflightOk = preflightClearedByMission.getOrDefault(m.getId(), false);
            if (isFlownOrActive && preflightOk) {
                preflightSigned++;
            }

            Integer rating = ratingByMission.get(m.getId());
            if (rating != null) {
                ratingSum += rating;
                reviewCount++;
            }

            if (recentEntries.size() < 15) {
                recentEntries.add(
                        new LoggedFlightEntry(
                                m.getId(),
                                m.getCode(),
                                m.getTitle(),
                                m.getMissionType(),
                                m.getStatus(),
                                m.getLocationName(),
                                m.getUav() == null ? null : m.getUav().getSerialNumber(),
                                m.getStartTime(),
                                m.getCompletedAt(),
                                round1(hours),
                                preflightOk,
                                rating));
            }
        }

        double complianceRate =
                flownOrActiveCount > 0
                        ? round1((preflightSigned * 100.0) / flownOrActiveCount)
                        : 100.0;
        Double avgRating =
                reviewCount > 0 ? round1((double) ratingSum / (double) reviewCount) : null;

        return new OperatorLogbookResponse(
                target.getUsername(),
                target.getFullName() == null || target.getFullName().isBlank()
                        ? target.getUsername()
                        : target.getFullName(),
                totalAssigned,
                completedCount,
                round1(totalHours),
                preflightSigned,
                complianceRate,
                avgRating,
                reviewCount,
                List.copyOf(recentEntries));
    }

    @Override
    @Transactional(readOnly = true)
    public MissionDispatchCandidatesResponse dispatchCandidates(
            Long id, Authentication authentication) {
        requireDispatchViewer(authentication);
        Mission mission = access.accessible(id, authentication);

        List<MissionStatus> excluded =
                Objects.requireNonNullElse(resources.excludedStatuses(), List.of());
        List<Station> allStations = Objects.requireNonNullElse(stations.findAll(), List.of());
        List<Uav> allUavs = Objects.requireNonNullElse(uavs.findAllWithStation(), List.of());
        List<Equipment> allEquipment =
                Objects.requireNonNullElse(equipmentRepository.findAllWithStation(), List.of());
        List<AppUser> operators =
                Objects.requireNonNullElse(users.findByRole(UserRole.ROLE_OPERATOR), List.of());
        List<Mission> activeMissions =
                Objects.requireNonNullElse(
                        missions.findActiveWithResourcesNotIn(excluded), List.of());
        Map<Long, Long> completedCountByOperator =
                MissionSmartDispatchOperations.parseOperatorCounts(
                        missions.countCompletedByOperator());
        Map<Long, Double> avgRatingByOperator =
                MissionSmartDispatchOperations.parseOperatorRatings(
                        reviews.averageOverallRatingByOperator());
        List<MissionEquipmentReservation> activeReservations =
                reservations == null
                        ? List.of()
                        : Objects.requireNonNullElse(
                                reservations.findByMissionIdAndReleasedFalse(id), List.of());
        List<UavTelemetry> latestTelemetry =
                telemetry == null ? List.of() : telemetry.latestPerUav();
        Set<Long> activeRepairUavIds =
                repairOrders == null
                        ? Set.of()
                        : Objects.requireNonNullElse(
                                repairOrders.findUavIdsWithStatusIn(ACTIVE_REPAIR_STATUSES),
                                Set.of());

        return MissionSmartDispatchOperations.evaluateCandidates(
                mission,
                allStations,
                allUavs,
                allEquipment,
                operators,
                activeMissions,
                completedCountByOperator,
                avgRatingByOperator,
                activeReservations,
                latestTelemetry,
                activeRepairUavIds,
                excluded,
                resources);
    }

    @Override
    public MissionResponse autoAssign(Long id, Authentication authentication) {
        requireAnyDispatchWritePermission(authentication);
        Mission mission = access.accessibleForUpdate(id, authentication);
        dispatch.ensureResourceAssignmentAllowed(mission);

        boolean needStation = mission.getStation() == null;
        boolean needUav = mission.getUav() == null;
        boolean needOperator = mission.getOperator() == null;
        boolean needEquipment =
                reservations != null && !reservations.existsByMissionIdAndReleasedFalse(id);

        if (needStation && !hasPermission(authentication, "MISSION_ASSIGN_STATION")) {
            throw new AccessDeniedException("Missing MISSION_ASSIGN_STATION permission");
        }
        if (needUav && !hasPermission(authentication, "MISSION_ASSIGN_UAV")) {
            throw new AccessDeniedException("Missing MISSION_ASSIGN_UAV permission");
        }
        if (needOperator && !hasPermission(authentication, "MISSION_ASSIGN_OPERATOR")) {
            throw new AccessDeniedException("Missing MISSION_ASSIGN_OPERATOR permission");
        }
        if (needEquipment && !hasPermission(authentication, "MISSION_RESERVE_EQUIPMENT")) {
            throw new AccessDeniedException("Missing MISSION_RESERVE_EQUIPMENT permission");
        }

        MissionDispatchCandidatesResponse plan = dispatchCandidates(id, authentication);
        if (needStation && plan.recommendedStationId() == null) {
            throw SystemException.conflict(
                    "Không tìm thấy trạm khai thác khả dụng và đồng bộ cho nhiệm vụ này.",
                    "AUTO_DISPATCH_NO_CANDIDATES");
        }

        boolean assignedAny = false;
        MissionResponse latest = missionMapper.toResponse(mission);

        if (needStation && plan.recommendedStationId() != null) {
            latest =
                    dispatch.assignStation(
                            id,
                            new ResourceAssignmentRequest(plan.recommendedStationId()),
                            authentication);
            assignedAny = true;
        }
        if (needUav && plan.recommendedUavId() != null) {
            latest =
                    dispatch.assignUav(
                            id,
                            new ResourceAssignmentRequest(plan.recommendedUavId()),
                            authentication);
            assignedAny = true;
        }
        if (needOperator && plan.recommendedOperatorId() != null) {
            latest =
                    dispatch.assignOperator(
                            id,
                            new ResourceAssignmentRequest(plan.recommendedOperatorId()),
                            authentication);
            assignedAny = true;
        }
        if (needEquipment && plan.recommendedEquipmentId() != null) {
            latest =
                    dispatch.reserveEquipment(
                            id,
                            new ResourceAssignmentRequest(plan.recommendedEquipmentId(), 1, null),
                            authentication);
            assignedAny = true;
        }

        if (!assignedAny && (needStation || needUav || needOperator || needEquipment)) {
            throw SystemException.conflict(
                    "Không tìm thấy tổ hợp nguồn lực khả dụng và không trùng khung giờ cho nhiệm vụ này.",
                    "AUTO_DISPATCH_NO_CANDIDATES");
        }
        return latest;
    }

    private boolean hasPermission(Authentication authentication, String permission) {
        return permissionService != null
                ? permissionService.has(authentication, permission)
                : access.hasAuthority(authentication, permission);
    }

    private void requireAnyDispatchWritePermission(Authentication authentication) {
        if (!hasPermission(authentication, "MISSION_ASSIGN_STATION")
                && !hasPermission(authentication, "MISSION_ASSIGN_UAV")
                && !hasPermission(authentication, "MISSION_ASSIGN_OPERATOR")
                && !hasPermission(authentication, "MISSION_RESERVE_EQUIPMENT")) {
            throw new AccessDeniedException("Auto-assign requires dispatcher write permissions");
        }
    }

    private void requireDispatchViewer(Authentication authentication) {
        if (!hasPermission(authentication, "MISSION_VIEW_ALL")
                && !hasPermission(authentication, "MISSION_CONFIRM")
                && !hasPermission(authentication, "MISSION_ASSIGN_STATION")
                && !hasPermission(authentication, "MISSION_ASSIGN_UAV")
                && !hasPermission(authentication, "MISSION_ASSIGN_OPERATOR")
                && !hasPermission(authentication, "MISSION_RESERVE_EQUIPMENT")) {
            throw new AccessDeniedException("Dispatch candidates require dispatcher permissions");
        }
    }

    private static double durationHours(Mission m) {
        if (m.getStartTime() == null) return 0.5;
        long plannedMinutes =
                m.getExpectedEndTime() != null && m.getExpectedEndTime().isAfter(m.getStartTime())
                        ? Duration.between(m.getStartTime(), m.getExpectedEndTime()).toMinutes()
                        : 60L;
        long effectiveMinutes = plannedMinutes;
        if (m.getCompletedAt() != null && m.getCompletedAt().isAfter(m.getStartTime())) {
            long actualMinutes = Duration.between(m.getStartTime(), m.getCompletedAt()).toMinutes();
            if (actualMinutes <= Math.max(plannedMinutes * 2L, 240L)) {
                effectiveMinutes = actualMinutes;
            }
        }
        return Math.max(0.5, effectiveMinutes / 60.0);
    }

    private static double round1(double val) {
        return Math.round(val * 10.0) / 10.0;
    }

    private static MissionReviewResponse toReviewResponse(MissionReview review, Mission mission) {
        AppUser c = review.getCustomer();
        return new MissionReviewResponse(
                true,
                review.getId(),
                mission.getId(),
                mission.getCode(),
                c == null ? null : c.getId(),
                c == null ? null : c.getUsername(),
                c == null ? null : c.getFullName(),
                review.getOverallRating(),
                review.getDataQualityRating(),
                review.getTimelinessRating(),
                review.isDeliverablesAccepted(),
                review.getComment(),
                review.getCreatedAt(),
                review.getUpdatedAt());
    }

    private static MissionPreflightResponse toPreflightResponse(MissionPreflightLog log) {
        return new MissionPreflightResponse(
                true,
                log.getId(),
                log.getMission() == null ? null : log.getMission().getId(),
                log.getSignedByUsername(),
                log.getSignedAt(),
                log.isAirframeAndPropellersSafe(),
                log.isBatteryHealthy(),
                log.isGnssRtkLocked(),
                log.isWeatherWithinLimits(),
                log.isAirspaceAndPermitCleared(),
                log.getMeasuredBatteryPct(),
                log.getSatelliteCount(),
                log.getMeasuredWindMs(),
                log.isClearedForTakeoff(),
                log.getNotes(),
                log.getUpdatedAt());
    }

    private void notifyOperatorOfReview(Mission mission, MissionReview review) {
        NotificationService service = notifications == null ? null : notifications.getIfAvailable();
        if (service == null
                || mission.getOperator() == null
                || mission.getOperator().getId() == null) {
            return;
        }
        try {
            service.sendNotification(
                    new CreateNotificationRequest(
                            mission.getOperator().getId(),
                            "Khách hàng đã nghiệm thu nhiệm vụ " + mission.getCode(),
                            "Đánh giá chất lượng bàn giao: "
                                    + review.getOverallRating()
                                    + "/5 sao.",
                            NotificationType.MISSION_STATUS_CHANGED,
                            "MISSION",
                            mission.getId()));
        } catch (RuntimeException ignored) {
        }
    }

    @Override
    @Transactional(readOnly = true)
    public MissionInspectionReportResponse inspectionReport(
            Long id, List<MissionMediaResponse> mediaItems, Authentication authentication) {
        Mission mission = access.accessible(id, authentication);
        MissionPreflightLog preflight = preflightLogs.findByMissionId(id).orElse(null);
        MissionReview review = reviews.findByMissionId(id).orElse(null);
        boolean canSeeInternalFleet =
                hasPermission(authentication, "MISSION_VIEW_ALL")
                        || hasPermission(authentication, "MARKETPLACE_MODERATE");
        if (!canSeeInternalFleet && authentication != null && authentication.getName() != null) {
            String viewer = authentication.getName();
            if ((mission.getOperator() != null
                            && viewer.equalsIgnoreCase(mission.getOperator().getUsername()))
                    || (mission.getProvider() != null
                            && mission.getProvider().getUser() != null
                            && viewer.equalsIgnoreCase(
                                    mission.getProvider().getUser().getUsername()))) {
                canSeeInternalFleet = true;
            }
        }
        return MissionInspectionOperations.buildReport(
                mission, mediaItems, preflight, review, !canSeeInternalFleet);
    }
}
