package com.uav.platform.modules.mission.service.impl;

import com.uav.platform.modules.mission.mapper.MissionEventMapper;
import com.uav.platform.modules.mission.mapper.MissionMapper;
import com.uav.platform.modules.mission.mapper.MissionMediaMapper;

import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.audit.common.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.common.UserRole;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.PermissionService;
import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.mission.config.request.*;
import com.uav.platform.modules.mission.config.response.*;
import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.repository.MissionEventRepository;
import com.uav.platform.modules.mission.repository.MissionEquipmentReservationRepository;
import com.uav.platform.modules.mission.repository.MissionMediaRepository;
import com.uav.platform.modules.mission.specification.MissionSpecifications;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.repository.UavServiceRepository;
import com.uav.platform.modules.inventory.config.request.QuantityRequest;
import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.inventory.common.EquipmentStatus;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.service.InventoryService;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.common.StationStatus;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.common.UavStatus;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.mission.service.MissionService;
import com.uav.platform.modules.notification.common.NotificationType;
import com.uav.platform.modules.notification.config.request.CreateNotificationRequest;
import com.uav.platform.modules.notification.service.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@Service
@Transactional
public class IMissionService implements MissionService {
    private final MissionRepository missions;
    private final UavServiceRepository services;
    private final UserRepository users;
    private final PermissionService permissions;
    private final AuditLogService audit;
    private final MissionEventRepository events;
    private final StationRepository stations;
    private final UavRepository uavs;
    private final EquipmentRepository equipment;
    private final InventoryService inventory;
    private final MissionEquipmentReservationRepository reservations;
    private final MediaAssetRepository mediaAssets;
    @org.springframework.beans.factory.annotation.Autowired
    private com.uav.platform.modules.media.service.MediaAccessService mediaAccess;
    private final MissionMediaRepository missionMedia;
    private final com.uav.platform.modules.uav.service.UavService uavService;
    private final NotificationService notifications;

    public IMissionService(MissionRepository missions, UavServiceRepository services, UserRepository users,
                              PermissionService permissions, AuditLogService audit, MissionEventRepository events) {
        this.missions = missions; this.services = services; this.users = users;
        this.permissions = permissions; this.audit = audit; this.events = events;
        this.stations = null; this.uavs = null; this.equipment = null; this.inventory = null; this.reservations = null;
        this.mediaAssets = null; this.missionMedia = null;
        this.uavService = null;
        this.notifications = null;
    }

    public IMissionService(MissionRepository missions, UavServiceRepository services, UserRepository users,
                              PermissionService permissions, AuditLogService audit, MissionEventRepository events,
                              StationRepository stations, UavRepository uavs, EquipmentRepository equipment,
                              InventoryService inventory, MissionEquipmentReservationRepository reservations) {
        this.missions = missions; this.services = services; this.users = users;
        this.permissions = permissions; this.audit = audit; this.events = events;
        this.stations = stations; this.uavs = uavs; this.equipment = equipment; this.inventory = inventory; this.reservations = reservations;
        this.mediaAssets = null; this.missionMedia = null;
        this.uavService = null;
        this.notifications = null;
    }

    public IMissionService(MissionRepository missions, UavServiceRepository services, UserRepository users,
                              PermissionService permissions, AuditLogService audit, MissionEventRepository events,
                              StationRepository stations, UavRepository uavs, EquipmentRepository equipment,
                              InventoryService inventory, MissionEquipmentReservationRepository reservations,
                              MediaAssetRepository mediaAssets, MissionMediaRepository missionMedia, com.uav.platform.modules.uav.service.UavService uavService) {
        this(missions, services, users, permissions, audit, events, stations, uavs, equipment, inventory,
                reservations, mediaAssets, missionMedia, uavService, null);
    }

    @Autowired
    public IMissionService(MissionRepository missions, UavServiceRepository services, UserRepository users,
                              PermissionService permissions, AuditLogService audit, MissionEventRepository events,
                              StationRepository stations, UavRepository uavs, EquipmentRepository equipment,
                              InventoryService inventory, MissionEquipmentReservationRepository reservations,
                              MediaAssetRepository mediaAssets, MissionMediaRepository missionMedia, com.uav.platform.modules.uav.service.UavService uavService,
                              NotificationService notifications) {
        this.missions = missions; this.services = services; this.users = users; this.permissions = permissions; this.audit = audit; this.events = events;
        this.stations = stations; this.uavs = uavs; this.equipment = equipment; this.inventory = inventory; this.reservations = reservations;
        this.mediaAssets = mediaAssets; this.missionMedia = missionMedia;
        this.uavService = uavService;
        this.notifications = notifications;
    }

    @Override
    public MissionResponse create(MissionCreateRequest request, String actorUsername) {
        AppUser customer = user(actorUsername);
        Mission mission = Mission.draft(customer, request.missionType(), request.title(), request.description(),
                request.requestedDate(), request.startTime(), request.expectedEndTime(), request.locationName(),
                request.latitude(), request.longitude(), request.priority(), request.notes());
        mission.setCode(nextCode(request.requestedDate().getYear()));
        if (request.serviceId() != null) {
            UavService service = services.findById(request.serviceId())
                    .orElseThrow(() -> SystemException.notFound("UAV service not found"));
            if (!service.isActive()) throw SystemException.conflict("UAV service is inactive");
            mission.setService(service);
        }
        Mission saved = missions.save(mission);
        events.save(new MissionEvent(saved, MissionEventType.CREATED, customer, null, MissionStatus.DRAFT,
                "Mission created", null));
        audit.record(customer.getId(), actorUsername, AuditAction.CREATE, "MISSION", saved.getId().toString(), saved.getCode());
        return MissionMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionResponse get(Long id, Authentication authentication) {
        Mission mission = find(id);
        enforceVisibility(mission, authentication);
        return MissionMapper.toResponse(mission);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MissionResponse> list(MissionFilter filter, Pageable pageable, Authentication authentication) {
        MissionFilter safeFilter = filter == null ? MissionFilter.empty() : filter;
        boolean viewAll = permissions.has(authentication, "MISSION_VIEW_ALL");
        Long ownerId = null;
        if (!viewAll && authentication != null) {
            AppUser viewer = user(authentication.getName());
            if (viewer.getRole() == UserRole.ROLE_OPERATOR) {
                safeFilter = new MissionFilter(safeFilter.status(), safeFilter.missionType(), safeFilter.stationId(), viewer.getId(), null, safeFilter.requestedDate(), safeFilter.search());
            } else {
                ownerId = viewer.getId();
            }
        }
        Page<Mission> page = missions.findAll(MissionSpecifications.filtered(safeFilter, ownerId), pageable);
        return PageResponse.from(page, MissionMapper::toResponse);
    }

    @Override
    public MissionResponse updateDraft(Long id, MissionUpdateRequest request, Authentication authentication) {
        Mission mission = find(id);
        enforceVisibility(mission, authentication);
        mission.updateDraft(request.title(), request.description(), request.requestedDate(), request.startTime(),
                request.expectedEndTime(), request.locationName(), request.latitude(), request.longitude(),
                request.priority(), request.notes());
        events.save(new MissionEvent(mission, MissionEventType.UPDATED, user(authentication.getName()),
                MissionStatus.DRAFT, MissionStatus.DRAFT, "Mission updated", null));
        audit.record(null, authentication.getName(), AuditAction.UPDATE, "MISSION", id.toString(), mission.getCode());
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse submit(Long id, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        MissionStatus old = mission.getStatus();
        mission.transitionTo(MissionStatus.PENDING_CONFIRMATION);
        event(mission, MissionEventType.SUBMITTED, authentication, old, mission.getStatus(), "Mission submitted");
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "PENDING_CONFIRMATION");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse cancel(Long id, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        MissionStatus old = mission.getStatus();
        releaseResources(mission, authentication.getName());
        mission.transitionTo(MissionStatus.CANCELLED);
        event(mission, MissionEventType.CANCELLED, authentication, old, mission.getStatus(), "Mission cancelled");
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "CANCELLED");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse assignStation(Long id, ResourceAssignmentRequest request, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        ensureResourceAssignmentAllowed(mission);
        Station station = stations.findById(request.resourceId()).orElseThrow(() -> SystemException.notFound("Station not found"));
        if (station.getStatus() != StationStatus.ACTIVE) throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        if (mission.getUav() != null && mission.getUav().getStation() != null
                && !station.getId().equals(mission.getUav().getStation().getId())) {
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        }
        mission.assignStation(station);
        event(mission, MissionEventType.STATION_ASSIGNED, authentication, mission.getStatus(), mission.getStatus(), "Station assigned");
        maybeMarkResourcesReserved(mission, authentication);
        audit.record(null, authentication.getName(), AuditAction.ASSIGN, "MISSION", id.toString(), "STATION:" + station.getCode());
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse assignUav(Long id, ResourceAssignmentRequest request, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        ensureResourceAssignmentAllowed(mission);
        if (mission.getUav() != null && !mission.getUav().getId().equals(request.resourceId())) throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        Uav uav = uavs.findByIdForUpdate(request.resourceId()).orElseThrow(() -> SystemException.notFound("UAV not found"));
        if (uav.getStatus() != UavStatus.AVAILABLE) throw SystemException.conflict("UAV_NOT_AVAILABLE");
        if (mission.getStation() != null && uav.getStation() != null && !mission.getStation().getId().equals(uav.getStation().getId())) {
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        }
        if (missions.exists(MissionSpecifications.overlappingUav(uav.getId(), excludedStatuses(), mission.getStartTime(), mission.getExpectedEndTime()))) {
            throw SystemException.conflict("UAV_TIME_CONFLICT");
        }
        mission.assignUav(uav);
        changeUavStatus(uav, UavStatus.ASSIGNED, "Mission UAV assigned", authentication.getName());
        event(mission, MissionEventType.UAV_ASSIGNED, authentication, mission.getStatus(), mission.getStatus(), "UAV assigned");
        maybeMarkResourcesReserved(mission, authentication);
        audit.record(null, authentication.getName(), AuditAction.ASSIGN, "MISSION", id.toString(), "UAV:" + uav.getSerialNumber());
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse assignOperator(Long id, ResourceAssignmentRequest request, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        ensureResourceAssignmentAllowed(mission);
        if (mission.getOperator() != null && !mission.getOperator().getId().equals(request.resourceId())) throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        AppUser operator = users.findByIdForUpdate(request.resourceId()).orElseThrow(() -> SystemException.notFound("Operator not found"));
        if (operator.getStatus() != com.uav.platform.modules.user.common.UserStatus.ACTIVE) throw SystemException.conflict("OPERATOR_NOT_AVAILABLE");
        if (missions.exists(MissionSpecifications.overlappingOperator(operator.getId(), excludedStatuses(), mission.getStartTime(), mission.getExpectedEndTime()))) {
            throw SystemException.conflict("OPERATOR_TIME_CONFLICT");
        }
        mission.assignOperator(operator);
        event(mission, MissionEventType.OPERATOR_ASSIGNED, authentication, mission.getStatus(), mission.getStatus(), "Operator assigned");
        maybeMarkResourcesReserved(mission, authentication);
        audit.record(operator.getId(), authentication.getName(), AuditAction.ASSIGN, "MISSION", id.toString(), "OPERATOR:" + operator.getUsername());
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse reserveEquipment(Long id, ResourceAssignmentRequest request, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        ensureResourceAssignmentAllowed(mission);
        Equipment item = equipment.findById(request.resourceId()).orElseThrow(() -> SystemException.notFound("Equipment not found"));
        if (item.getStatus() != EquipmentStatus.ACTIVE || item.getAvailableQuantity() < request.quantity()) {
            throw SystemException.conflict("INVENTORY_NOT_AVAILABLE");
        }
        inventory.reserve(item.getId(), new QuantityRequest(request.quantity(), request.note()), authentication.getName());
        reservations.save(new MissionEquipmentReservation(mission, item, request.quantity(), authentication.getName()));
        event(mission, MissionEventType.EQUIPMENT_RESERVED, authentication, mission.getStatus(), mission.getStatus(), "Equipment reserved");
        maybeMarkResourcesReserved(mission, authentication);
        audit.record(null, authentication.getName(), AuditAction.RESERVE, "MISSION", id.toString(), "EQUIPMENT:" + item.getId());
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse confirm(Long id, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        MissionStatus old = mission.getStatus(); mission.transitionTo(MissionStatus.CONFIRMED);
        event(mission, MissionEventType.STATUS_CHANGED, authentication, old, mission.getStatus(), "Mission confirmed");
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "CONFIRMED");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse reject(Long id, String reason, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        MissionStatus old = mission.getStatus();
        releaseResources(mission, authentication.getName());
        mission.transitionTo(MissionStatus.REJECTED);
        event(mission, MissionEventType.REJECTED, authentication, old, mission.getStatus(), reason);
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "REJECTED:" + reason);
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse ready(Long id, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        boolean equipmentValid = reservations != null && reservations.findByMissionIdAndReleasedFalse(id).stream()
                .allMatch(item -> item.getEquipment().getStatus() == EquipmentStatus.ACTIVE
                        && item.getEquipment().getReservedQuantity() >= item.getQuantity());
        boolean resourcesValid = mission.hasRequiredResources(equipmentValid)
                && mission.getStation().getStatus() == StationStatus.ACTIVE
                && mission.getOperator().getStatus() == com.uav.platform.modules.user.common.UserStatus.ACTIVE
                && (mission.getUav().getStatus() == UavStatus.ASSIGNED || mission.getUav().getStatus() == UavStatus.AVAILABLE);
        if (!resourcesValid) {
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        }
        MissionStatus old = mission.getStatus(); mission.transitionTo(MissionStatus.READY);
        event(mission, MissionEventType.STATUS_CHANGED, authentication, old, mission.getStatus(), "Mission ready");
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "READY");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse start(Long id, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        requireAssignedOperator(mission, authentication);
        if (mission.getUav() == null || (mission.getUav().getStatus() != UavStatus.ASSIGNED && mission.getUav().getStatus() != UavStatus.AVAILABLE)) {
            throw SystemException.conflict("UAV_NOT_AVAILABLE");
        }
        MissionStatus old = mission.getStatus(); mission.transitionTo(MissionStatus.IN_PROGRESS);
        changeUavStatus(mission.getUav(), UavStatus.IN_USE, "Mission started", authentication.getName());
        event(mission, MissionEventType.STATUS_CHANGED, authentication, old, mission.getStatus(), "Mission started");
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "IN_PROGRESS");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse complete(Long id, MissionCompletionRequest request, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        requireAssignedOperator(mission, authentication);
        MissionStatus old = mission.getStatus();
        releaseResources(mission, authentication.getName());
        mission.complete(request.completionNote(), request.equipmentCondition());
        event(mission, MissionEventType.COMPLETED, authentication, old, mission.getStatus(), request.completionNote());
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "COMPLETED");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse fail(Long id, MissionFailureRequest request, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        requireAssignedOperator(mission, authentication);
        MissionStatus old = mission.getStatus();
        releaseResources(mission, authentication.getName());
        mission.fail(request.failureReason(), request.notes());
        event(mission, MissionEventType.FAILED, authentication, old, mission.getStatus(), request.failureReason());
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "FAILED");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionMediaResponse attachMedia(Long id, MissionMediaRequest request, Authentication authentication) {
        if (!permissions.has(authentication, "MISSION_MEDIA_UPLOAD")) {
            throw new org.springframework.security.access.AccessDeniedException("Mission media upload is not permitted");
        }
        Mission mission = accessible(id, authentication);
        if (missionMedia.existsByMissionIdAndMediaId(id, request.mediaId())) throw SystemException.conflict("Media already attached");
        MediaAsset media = mediaAssets.findById(request.mediaId()).orElseThrow(() -> SystemException.notFound("Media not found"));
        if(media.isDeleted() || !media.isConfirmed()) throw SystemException.conflict("Media upload must be confirmed before attachment");
        if(mediaAccess!=null) mediaAccess.requireFile(media,authentication.getName(),true);
        if("MISSION".equals(media.getLinkedEntityType()) && !id.toString().equals(media.getLinkedEntityId())) throw new org.springframework.security.access.AccessDeniedException("Media belongs to another mission");
        AppUser actor = user(authentication.getName());
        MissionMedia link = missionMedia.save(new MissionMedia(mission, media, request.mediaRole(), actor));
        event(mission, MissionEventType.MEDIA_ATTACHED, authentication, mission.getStatus(), mission.getStatus(), "Media attached");
        audit.record(actor.getId(), authentication.getName(), AuditAction.UPLOAD, "MISSION_MEDIA", id.toString(), media.getId().toString());
        return MissionMediaMapper.toResponse(link);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionMediaResponse> listMedia(Long id, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        return missionMedia.findByMissionIdOrderByCreatedAtAsc(mission.getId()).stream().map(MissionMediaMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionEventResponse> timeline(Long id, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        return events.findByMissionIdOrderByCreatedAtAsc(mission.getId()).stream().map(MissionEventMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MissionAvailabilityResponse availability(java.time.LocalDateTime startTime, java.time.LocalDateTime endTime,
                                                     Long stationId, Long uavId, Long operatorId) {
        if (startTime == null || endTime == null || !endTime.isAfter(startTime)) {
            return new MissionAvailabilityResponse(false, false, false, false, "MISSION_TIME_CONFLICT");
        }
        boolean stationAvailable = stationId == null || stations.findById(stationId)
                .map(item -> item.getStatus() == StationStatus.ACTIVE).orElse(false);
        boolean uavAvailable = uavId == null || uavs.findById(uavId)
                .filter(item -> item.getStatus() == UavStatus.AVAILABLE)
                .map(item -> !missions.exists(MissionSpecifications.overlappingUav(item.getId(), excludedStatuses(), startTime, endTime))).orElse(false);
        boolean operatorAvailable = operatorId == null || users.findById(operatorId)
                .filter(item -> item.getStatus() == com.uav.platform.modules.user.common.UserStatus.ACTIVE)
                .map(item -> !missions.exists(MissionSpecifications.overlappingOperator(item.getId(), excludedStatuses(), startTime, endTime))).orElse(false);
        boolean available = stationAvailable && uavAvailable && operatorAvailable;
        return new MissionAvailabilityResponse(available, stationAvailable, uavAvailable, operatorAvailable,
                available ? "AVAILABLE" : "MISSION_TIME_CONFLICT");
    }

    @Override
    public MissionResponse acceptOperator(Long id, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        requireAssignedOperator(mission, authentication);
        mission.acceptOperator();
        event(mission, MissionEventType.OPERATOR_ACCEPTED, authentication, mission.getStatus(), mission.getStatus(), "Operator accepted assignment");
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "OPERATOR_ACCEPTED");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse reportOperatorConflict(Long id, String note, Authentication authentication) {
        Mission mission = accessible(id, authentication);
        requireAssignedOperator(mission, authentication);
        mission.reportOperatorConflict(note);
        event(mission, MissionEventType.OPERATOR_CONFLICT, authentication, mission.getStatus(), mission.getStatus(), note);
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "OPERATOR_CONFLICT");
        return MissionMapper.toResponse(mission);
    }

    private String nextCode(int year) {
        long next = missions.count() + 1;
        String code;
        do { code = String.format("MSN-%d-%06d", year, next++); }
        while (missions.findByCode(code).isPresent());
        return code;
    }

    private Mission accessible(Long id, Authentication authentication) {
        Mission mission = find(id);
        enforceVisibility(mission, authentication);
        return mission;
    }

    private void ensureResourceAssignmentAllowed(Mission mission) {
        if (mission.getStatus() != MissionStatus.CONFIRMED && mission.getStatus() != MissionStatus.RESOURCE_RESERVED) {
            throw SystemException.conflict("MISSION_INVALID_STATUS");
        }
    }

    private List<MissionStatus> excludedStatuses() {
        return List.of(MissionStatus.CANCELLED, MissionStatus.COMPLETED, MissionStatus.FAILED, MissionStatus.REJECTED);
    }

    private void event(Mission mission, MissionEventType type, Authentication authentication,
                       MissionStatus oldStatus, MissionStatus newStatus, String description) {
        events.save(new MissionEvent(mission, type, authentication == null ? null : user(authentication.getName()),
                oldStatus, newStatus, description, null));
        notifyParties(mission, authentication, type, description);
    }

    private void notifyParties(Mission mission, Authentication actor, MissionEventType type, String description) {
        if (notifications == null) return;
        String actorName = actor == null ? null : actor.getName();
        AppUser customer = mission.getCustomer();
        AppUser operator = mission.getOperator();
        notifyUser(customer, actorName, mission, type, description);
        if (operator != null && (customer == null || !operator.getId().equals(customer.getId()))) {
            notifyUser(operator, actorName, mission, type, description);
        }
    }

    private void notifyUser(AppUser recipient, String actorName, Mission mission, MissionEventType type, String description) {
        if (recipient == null || recipient.getId() == null || recipient.getUsername().equals(actorName)) return;
        NotificationType notificationType = type == MissionEventType.OPERATOR_ASSIGNED
                ? NotificationType.MISSION_ASSIGNED : NotificationType.MISSION_STATUS_CHANGED;
        String title = "Mission " + (mission.getCode() == null ? mission.getId() : mission.getCode());
        String content = description == null || description.isBlank() ? type.name() : description;
        try {
            notifications.sendNotification(new CreateNotificationRequest(
                    recipient.getId(), title, content, notificationType, "MISSION", mission.getId()));
        } catch (RuntimeException ignored) {
        }
    }

    private void releaseResources(Mission mission, String actor) {
        if (reservations != null && inventory != null) {
            for (MissionEquipmentReservation reservation : reservations.findByMissionIdAndReleasedFalse(mission.getId())) {
                inventory.release(reservation.getEquipment().getId(), new QuantityRequest(reservation.getQuantity(), "Mission released"), actor);
                reservation.release();
            }
        }
        if (mission.getUav() != null && (mission.getUav().getStatus() == UavStatus.ASSIGNED || mission.getUav().getStatus() == UavStatus.IN_USE)) {
            changeUavStatus(mission.getUav(), UavStatus.AVAILABLE, "Mission resources released", actor);
        }
    }

    private void maybeMarkResourcesReserved(Mission mission, Authentication authentication) {
        if (mission.getStatus() == MissionStatus.CONFIRMED
                && mission.hasRequiredResources(reservations != null && reservations.existsByMissionIdAndReleasedFalse(mission.getId()))) {
            MissionStatus old = mission.getStatus();
            mission.transitionTo(MissionStatus.RESOURCE_RESERVED);
            event(mission, MissionEventType.STATUS_CHANGED, authentication, old, mission.getStatus(), "Resources reserved");
            audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", mission.getId().toString(), "RESOURCE_RESERVED");
        }
    }

    private void requireAssignedOperator(Mission mission, Authentication authentication) {
        if (mission.getOperator() == null || authentication == null || !mission.getOperator().getUsername().equals(authentication.getName())) {
            throw new org.springframework.security.access.AccessDeniedException("Assigned operator required");
        }
    }

    private void changeUavStatus(Uav uav, UavStatus status, String reason, String actor) {
        if (uavService != null && uav.getId() != null) uavService.changeStatus(uav.getId(), status, reason, actor);
        else uav.setStatus(status);
    }

    private void enforceVisibility(Mission mission, Authentication authentication) {
        if (permissions.has(authentication, "MISSION_VIEW_ALL")) return;
        if (authentication == null || !authentication.isAuthenticated()
                || (!isCustomerOrOperator(mission, authentication.getName()))) {
            throw new org.springframework.security.access.AccessDeniedException("Mission is not visible to this user");
        }
    }

    private boolean isCustomerOrOperator(Mission mission, String username) {
        return (mission.getCustomer() != null && mission.getCustomer().getUsername().equals(username))
                || (mission.getOperator() != null && mission.getOperator().getUsername().equals(username));
    }

    private Mission find(Long id) { return missions.findById(id).orElseThrow(() -> SystemException.notFound("MISSION_NOT_FOUND")); }
    private AppUser user(String username) { return users.findByUsername(username).orElseThrow(() -> SystemException.notFound("User not found")); }
}
