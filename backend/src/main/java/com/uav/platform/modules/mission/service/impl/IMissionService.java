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
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;
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
    @Autowired(required = false)
    private com.uav.platform.modules.billing.service.QuotaService quotaService;
    @Autowired(required = false)
    private com.uav.platform.modules.settings.service.SystemConfigService systemConfigService;
    @Autowired(required = false)
    private com.uav.platform.modules.billing.repository.InvoiceRepository invoiceRepository;
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
        double estimatedHours = calculateDurationHours(request.startTime(), request.expectedEndTime());
        if (quotaService != null && customer.getId() != null) {
            try {
                quotaService.checkCanCreateMission(customer.getId(), estimatedHours);
            } catch (SystemException ex) {
                if (ex.getStatus() == org.springframework.http.HttpStatus.CONFLICT) {
                    throw ex;
                }
            }
        }
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
        Mission mission = accessibleForUpdate(id, authentication);
        if (request.expectedVersion() == null || request.expectedVersion() < 0) {
            throw SystemException.badRequest("MISSION_DRAFT_VERSION_REQUIRED");
        }
        if (mission.getVersion() != request.expectedVersion()) {
            throw SystemException.conflict("MISSION_DRAFT_STALE");
        }
        mission.updateDraft(request.title(), request.description(), request.requestedDate(), request.startTime(),
                request.expectedEndTime(), request.locationName(), request.latitude(), request.longitude(),
                request.priority(), request.notes());
        events.save(new MissionEvent(mission, MissionEventType.UPDATED, user(authentication.getName()),
                MissionStatus.DRAFT, MissionStatus.DRAFT, "Mission updated", null));
        audit.record(null, authentication.getName(), AuditAction.UPDATE, "MISSION", id.toString(), mission.getCode());
        // Return the version persisted by this edit, not the pre-flush JPA version.
        missions.flush();
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse submit(Long id, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        MissionStatus old = mission.getStatus();
        mission.transitionTo(MissionStatus.PENDING_CONFIRMATION);
        event(mission, MissionEventType.SUBMITTED, authentication, old, mission.getStatus(), "Mission submitted");
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "PENDING_CONFIRMATION");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse cancel(Long id, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        MissionStatus old = mission.getStatus();
        releaseResources(mission, authentication.getName());
        mission.transitionTo(MissionStatus.CANCELLED);
        event(mission, MissionEventType.CANCELLED, authentication, old, mission.getStatus(), "Mission cancelled");
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "CANCELLED");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse assignStation(Long id, ResourceAssignmentRequest request, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        ensureResourceAssignmentAllowed(mission);
        if (mission.getStation() != null) throw SystemException.conflict("MISSION_DISPATCH_REQUIRED");
        Station station = stations.findById(request.resourceId()).orElseThrow(() -> SystemException.notFound("Station not found"));
        if (station.getStatus() != StationStatus.ACTIVE) throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        if (mission.getUav() != null && mission.getUav().getStation() != null
                && !station.getId().equals(mission.getUav().getStation().getId())) {
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        }
        if (reservations != null && activeReservationsLocked(id).stream().anyMatch(r -> !sameStation(station, r.getEquipment().getStation()))) {
            throw SystemException.conflict("MISSION_STATION_RESOURCES_CONFLICT");
        }
        mission.assignStation(station);
        mission.invalidateAcceptance();
        event(mission, MissionEventType.STATION_ASSIGNED, authentication, mission.getStatus(), mission.getStatus(), "Station assigned");
        maybeMarkResourcesReserved(mission, authentication);
        audit.record(null, authentication.getName(), AuditAction.ASSIGN, "MISSION", id.toString(), "STATION:" + station.getCode());
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse assignUav(Long id, ResourceAssignmentRequest request, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        ensureResourceAssignmentAllowed(mission);
        if (mission.getUav() != null && !mission.getUav().getId().equals(request.resourceId())) throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        Uav uav = lockUav(request.resourceId());
        if (uav.getStatus() != UavStatus.AVAILABLE
                || missions.existsByUavIdAndIdNotAndStatusNotIn(uav.getId(), mission.getId(), excludedStatuses())) {
            throw SystemException.conflict("UAV_NOT_AVAILABLE");
        }
        if (mission.getStation() != null && uav.getStation() != null && !mission.getStation().getId().equals(uav.getStation().getId())) {
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        }
        if (missions.exists(MissionSpecifications.overlappingUav(uav.getId(), excludedStatuses(), mission.getStartTime(), mission.getExpectedEndTime()))) {
            throw SystemException.conflict("UAV_TIME_CONFLICT");
        }
        mission.assignUav(uav);
        mission.invalidateAcceptance();
        changeUavStatus(uav, UavStatus.ASSIGNED, "Mission UAV assigned", authentication.getName());
        event(mission, MissionEventType.UAV_ASSIGNED, authentication, mission.getStatus(), mission.getStatus(), "UAV assigned");
        maybeMarkResourcesReserved(mission, authentication);
        audit.record(null, authentication.getName(), AuditAction.ASSIGN, "MISSION", id.toString(), "UAV:" + uav.getSerialNumber());
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse replaceUav(Long id, MissionUavReplacementRequest request, Authentication authentication) {
        requireUavDispatchPermission(authentication);
        String reason = dispatchReason(request.reason());
        Mission mission = accessibleForUpdate(id, authentication);
        requireCurrentUav(mission, request.expectedCurrentUavId());
        if (request.replacementUavId() == null || request.replacementUavId() <= 0
                || request.replacementUavId().equals(request.expectedCurrentUavId())) {
            throw SystemException.badRequest("UAV_REPLACEMENT_MUST_DIFFER");
        }
        // Lock both rows in ID order so concurrent swaps cannot deadlock each other.
        Long firstId = Math.min(request.expectedCurrentUavId(), request.replacementUavId());
        Long secondId = Math.max(request.expectedCurrentUavId(), request.replacementUavId());
        Uav first = lockUav(firstId);
        Uav second = lockUav(secondId);
        Uav previous = firstId.equals(request.expectedCurrentUavId()) ? first : second;
        Uav replacement = firstId.equals(request.replacementUavId()) ? first : second;
        if (previous.getStatus() == UavStatus.IN_USE) throw SystemException.conflict("UAV_NOT_AVAILABLE");
        if (replacement.getStatus() != UavStatus.AVAILABLE
                || missions.existsByUavIdAndIdNotAndStatusNotIn(replacement.getId(), id, excludedStatuses())) {
            throw SystemException.conflict("UAV_NOT_AVAILABLE");
        }
        if ((mission.getStation() != null && mission.getStation().getStatus() != StationStatus.ACTIVE)
                || (replacement.getStation() != null && replacement.getStation().getStatus() != StationStatus.ACTIVE)
                || (mission.getStation() != null && replacement.getStation() != null
                && !mission.getStation().getId().equals(replacement.getStation().getId()))) {
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        }
        if (missions.exists(MissionSpecifications.overlappingUav(replacement.getId(), excludedStatuses(),
                mission.getStartTime(), mission.getExpectedEndTime()))) {
            throw SystemException.conflict("UAV_TIME_CONFLICT");
        }
        MissionStatus oldStatus = mission.getStatus();
        mission.redispatchUav(replacement, reservations.existsByMissionIdAndReleasedFalse(id));
        changeUavStatus(replacement, UavStatus.ASSIGNED, "Mission UAV replaced: " + id, authentication.getName());
        releasePreviousUav(previous, id, authentication.getName());
        recordRedispatch(mission, MissionEventType.UAV_REPLACED, oldStatus, previous.getId(), replacement.getId(), reason, authentication);
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse unassignUav(Long id, MissionUavUnassignmentRequest request, Authentication authentication) {
        requireUavDispatchPermission(authentication);
        String reason = dispatchReason(request.reason());
        Mission mission = accessibleForUpdate(id, authentication);
        requireCurrentUav(mission, request.expectedCurrentUavId());
        Uav previous = lockUav(request.expectedCurrentUavId());
        if (previous.getStatus() == UavStatus.IN_USE) throw SystemException.conflict("UAV_NOT_AVAILABLE");
        MissionStatus oldStatus = mission.getStatus();
        mission.redispatchUav(null, reservations.existsByMissionIdAndReleasedFalse(id));
        releasePreviousUav(previous, id, authentication.getName());
        recordRedispatch(mission, MissionEventType.UAV_UNASSIGNED, oldStatus, previous.getId(), null, reason, authentication);
        return MissionMapper.toResponse(mission);
    }

    private void requireUavDispatchPermission(Authentication authentication) {
        if (!permissions.has(authentication, "MISSION_ASSIGN_UAV")) {
            throw new org.springframework.security.access.AccessDeniedException("UAV dispatch is not permitted");
        }
    }

    private String dispatchReason(String reason) {
        if (reason == null || reason.isBlank() || reason.length() > 500) throw SystemException.badRequest("UAV_DISPATCH_REASON_REQUIRED");
        return reason.trim();
    }

    private void requireCurrentUav(Mission mission, Long expectedId) {
        if (mission.getStatus() != MissionStatus.CONFIRMED && mission.getStatus() != MissionStatus.RESOURCE_RESERVED
                && mission.getStatus() != MissionStatus.READY) throw SystemException.conflict("MISSION_INVALID_STATUS");
        if (expectedId == null || expectedId <= 0) throw SystemException.badRequest("UAV_DISPATCH_EXPECTED_ID_REQUIRED");
        if (mission.getUav() == null || !mission.getUav().getId().equals(expectedId)) {
            throw SystemException.conflict("MISSION_UAV_ASSIGNMENT_STALE");
        }
    }

    private void releasePreviousUav(Uav previous, Long missionId, String actor) {
        if (previous.getStatus() == UavStatus.ASSIGNED
                && !missions.existsByUavIdAndIdNotAndStatusNotIn(previous.getId(), missionId, excludedStatuses())) {
            changeUavStatus(previous, UavStatus.AVAILABLE, "Mission UAV released: " + missionId, actor);
        }
    }

    private void recordRedispatch(Mission mission, MissionEventType type, MissionStatus oldStatus,
                                  Long previousId, Long replacementId, String reason, Authentication authentication) {
        String metadata = "{\"previousUavId\":" + previousId + ",\"replacementUavId\":" + replacementId + "}";
        events.save(new MissionEvent(mission, type, user(authentication.getName()), oldStatus, mission.getStatus(), reason, metadata));
        audit.record(null, authentication.getName(), AuditAction.ASSIGN, "MISSION", mission.getId().toString(),
                type + ":" + previousId + "->" + replacementId + ":" + reason);
    }

    @Override
    public MissionResponse assignOperator(Long id, ResourceAssignmentRequest request, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        ensureResourceAssignmentAllowed(mission);
        if (mission.getOperator() != null && !mission.getOperator().getId().equals(request.resourceId())) throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        AppUser operator = lockOperator(request.resourceId());
        requireOperatorAvailable(operator, mission);
        mission.assignOperator(operator);
        mission.invalidateAcceptance();
        event(mission, MissionEventType.OPERATOR_ASSIGNED, authentication, mission.getStatus(), mission.getStatus(), "Operator assigned");
        maybeMarkResourcesReserved(mission, authentication);
        audit.record(operator.getId(), authentication.getName(), AuditAction.ASSIGN, "MISSION", id.toString(), "OPERATOR:" + operator.getUsername());
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse reserveEquipment(Long id, ResourceAssignmentRequest request, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        ensureResourceAssignmentAllowed(mission);
        Equipment item = lockEquipment(request.resourceId());
        if (!sameStation(mission.getStation(), item.getStation())) throw SystemException.conflict("MISSION_STATION_RESOURCES_CONFLICT");
        if (item.getStatus() != EquipmentStatus.ACTIVE || item.getAvailableQuantity() < request.quantity()) {
            throw SystemException.conflict("INVENTORY_NOT_AVAILABLE");
        }
        inventory.reserve(item.getId(), new QuantityRequest(request.quantity(), request.note()), authentication.getName());
        reservations.save(new MissionEquipmentReservation(mission, item, request.quantity(), authentication.getName()));
        mission.invalidateAcceptance();
        bumpDispatchVersion(mission);
        event(mission, MissionEventType.EQUIPMENT_RESERVED, authentication, mission.getStatus(), mission.getStatus(), "Equipment reserved");
        maybeMarkResourcesReserved(mission, authentication);
        audit.record(null, authentication.getName(), AuditAction.RESERVE, "MISSION", id.toString(), "EQUIPMENT:" + item.getId());
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionDispatchResourcesResponse dispatchResources(Long id, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        return new MissionDispatchResourcesResponse(MissionMapper.toResponse(mission), mission.getVersion(),
                mission.getStation() == null ? null : mission.getStation().getId(),
                mission.getOperator() == null ? null : mission.getOperator().getId(),
                reservations.findByMissionIdOrderByIdAsc(id).stream().map(r -> new MissionDispatchResourcesResponse.Reservation(
                        r.getId(), r.getEquipment().getId(), r.getEquipment().getName(),
                        r.getEquipment().getStation() == null ? null : r.getEquipment().getStation().getId(),
                        r.getQuantity(), r.isReleased(), r.getReleasedAt())).toList());
    }

    @Override
    public MissionResponse redispatchOperator(Long id, MissionResourceRedispatchRequest request, Authentication authentication) {
        requireDispatchPermission(authentication, "MISSION_ASSIGN_OPERATOR");
        String reason = resourceDispatchReason(request.reason());
        Mission mission = dispatchMission(id, request.expectedVersion(), authentication);
        Long oldId = mission.getOperator() == null ? null : mission.getOperator().getId();
        requireDifferentResource(oldId, request.replacementId());
        // Stable ordering serializes both replacements and ordinary assignments of the same operator.
        java.util.stream.Stream.of(oldId, request.replacementId()).filter(java.util.Objects::nonNull)
                .distinct().sorted().forEach(this::lockOperator);
        AppUser replacement = request.replacementId() == null ? null : lockOperator(request.replacementId());
        if (replacement != null) requireOperatorAvailable(replacement, mission);
        MissionStatus oldStatus = mission.getStatus();
        mission.assignOperator(replacement);
        finishResourceDispatch(mission, replacement == null ? MissionEventType.OPERATOR_UNASSIGNED : MissionEventType.OPERATOR_REPLACED,
                oldStatus, "operator", oldId, request.replacementId(), reason, authentication);
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse redispatchStation(Long id, MissionResourceRedispatchRequest request, Authentication authentication) {
        requireDispatchPermission(authentication, "MISSION_ASSIGN_STATION");
        String reason = resourceDispatchReason(request.reason());
        Mission mission = dispatchMission(id, request.expectedVersion(), authentication);
        Long oldId = mission.getStation() == null ? null : mission.getStation().getId();
        requireDifferentResource(oldId, request.replacementId());
        Station replacement = request.replacementId() == null ? null : stations.findById(request.replacementId())
                .orElseThrow(() -> SystemException.notFound("Station not found"));
        if (replacement != null && replacement.getStatus() != StationStatus.ACTIVE) throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        if (mission.getUav() != null) {
            Uav aircraft = lockUav(mission.getUav().getId());
            if (replacement == null || !sameStation(replacement, aircraft.getStation())) throw SystemException.conflict("MISSION_STATION_RESOURCES_CONFLICT");
        }
        var active = activeReservationsLocked(id);
        if (active.stream().anyMatch(r -> replacement == null || !sameStation(replacement, r.getEquipment().getStation()))) {
            throw SystemException.conflict("MISSION_STATION_RESOURCES_CONFLICT");
        }
        MissionStatus oldStatus = mission.getStatus();
        mission.assignStation(replacement);
        finishResourceDispatch(mission, replacement == null ? MissionEventType.STATION_UNASSIGNED : MissionEventType.STATION_REPLACED,
                oldStatus, "station", oldId, request.replacementId(), reason, authentication);
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse redispatchEquipment(Long id, MissionEquipmentRedispatchRequest request, Authentication authentication) {
        requireDispatchPermission(authentication, "MISSION_RESERVE_EQUIPMENT");
        String reason = resourceDispatchReason(request.reason());
        Mission mission = dispatchMission(id, request.expectedVersion(), authentication);
        MissionEquipmentReservation previous = reservations.findById(request.reservationId())
                .filter(r -> r.getMission().getId().equals(id) && !r.isReleased())
                .orElseThrow(() -> SystemException.conflict("MISSION_RESERVATION_STALE"));
        if (request.replacementId() != null && (request.replacementId() <= 0 || request.quantity() == null || request.quantity() <= 0)) {
            throw SystemException.badRequest("MISSION_EQUIPMENT_QUANTITY_INVALID");
        }
        if (request.replacementId() == null && request.quantity() != null) throw SystemException.badRequest("MISSION_EQUIPMENT_QUANTITY_INVALID");
        Long oldId = previous.getEquipment().getId();
        java.util.stream.Stream.of(oldId, request.replacementId()).filter(java.util.Objects::nonNull)
                .distinct().sorted().forEach(this::lockEquipment);
        Equipment oldItem = previous.getEquipment();
        Equipment replacement = request.replacementId() == null ? null : lockEquipment(request.replacementId());
        if (replacement != null) {
            if (oldId.equals(replacement.getId()) && previous.getQuantity() == request.quantity()) throw SystemException.badRequest("MISSION_RESOURCE_UNCHANGED");
            int available = replacement.getAvailableQuantity() + (oldId.equals(replacement.getId()) ? previous.getQuantity() : 0);
            if (replacement.getStatus() != EquipmentStatus.ACTIVE || available < request.quantity()) throw SystemException.conflict("INVENTORY_NOT_AVAILABLE");
            if (!sameStation(mission.getStation(), replacement.getStation())) throw SystemException.conflict("MISSION_STATION_RESOURCES_CONFLICT");
        }
        if (oldItem.getReservedQuantity() < reservations.activeQuantity(oldId)) throw SystemException.conflict("MISSION_RESERVATION_BALANCE_CONFLICT");
        // Mark released inside this transaction before inventory checks the remaining mission-owned quantity.
        previous.release();
        // The full reason belongs to the 500-character mission timeline. Inventory notes are limited to 255.
        String movementNote = "Mission #" + id + " redispatch reservation #" + previous.getId() + "; see mission timeline";
        inventory.release(oldId, new QuantityRequest(previous.getQuantity(), movementNote), authentication.getName());
        MissionEquipmentReservation next = null;
        if (replacement != null) {
            inventory.reserve(replacement.getId(), new QuantityRequest(request.quantity(), movementNote), authentication.getName());
            next = reservations.save(new MissionEquipmentReservation(mission, replacement, request.quantity(), authentication.getName()));
        }
        MissionEventType type = replacement == null ? MissionEventType.EQUIPMENT_RELEASED : MissionEventType.EQUIPMENT_CHANGED;
        String metadata = "{\"previousReservationId\":" + previous.getId() + ",\"previousEquipmentId\":" + oldId
                + ",\"previousQuantity\":" + previous.getQuantity() + ",\"replacementReservationId\":" + (next == null ? null : next.getId())
                + ",\"replacementEquipmentId\":" + request.replacementId() + ",\"replacementQuantity\":" + (next == null ? 0 : next.getQuantity()) + "}";
        recordResourceDispatch(mission, type, mission.getStatus(), metadata,
                "khoản #" + previous.getId() + " (thiết bị #" + oldId + " × " + previous.getQuantity() + ") → "
                + (next == null ? "hoàn trả" : "khoản #" + next.getId() + " (thiết bị #" + next.getEquipment().getId() + " × " + next.getQuantity() + ")"), reason, authentication);
        return MissionMapper.toResponse(mission);
    }

    private Mission dispatchMission(Long id, Long version, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        if (!List.of(MissionStatus.CONFIRMED, MissionStatus.RESOURCE_RESERVED, MissionStatus.READY).contains(mission.getStatus())) {
            throw SystemException.conflict("MISSION_INVALID_STATUS");
        }
        if (version == null || version < 0) throw SystemException.badRequest("MISSION_DISPATCH_VERSION_REQUIRED");
        if (mission.getVersion() != version) throw SystemException.conflict("MISSION_DISPATCH_STALE");
        return mission;
    }

    private void requireDispatchPermission(Authentication authentication, String permission) {
        if (!permissions.has(authentication, permission)) throw new org.springframework.security.access.AccessDeniedException("Resource dispatch is not permitted");
    }

    private String resourceDispatchReason(String reason) {
        if (reason == null || reason.isBlank() || reason.length() > 500) throw SystemException.badRequest("MISSION_DISPATCH_REASON_REQUIRED");
        return reason.trim();
    }

    private void requireDifferentResource(Long oldId, Long replacementId) {
        if (java.util.Objects.equals(oldId, replacementId)) throw SystemException.badRequest("MISSION_RESOURCE_UNCHANGED");
        if (replacementId != null && replacementId <= 0) throw SystemException.badRequest("MISSION_RESOURCE_ID_INVALID");
    }

    private void finishResourceDispatch(Mission mission, MissionEventType type, MissionStatus oldStatus, String resource,
            Long oldId, Long replacementId, String reason, Authentication authentication) {
        String metadata = "{\"resource\":\"" + resource + "\",\"previousId\":" + oldId + ",\"replacementId\":" + replacementId + "}";
        recordResourceDispatch(mission, type, oldStatus, metadata, oldId + "->" + replacementId, reason, authentication);
    }

    private void recordResourceDispatch(Mission mission, MissionEventType type, MissionStatus oldStatus,
            String metadata, String detail, String reason, Authentication authentication) {
        mission.resetDispatch(reservations.existsByMissionIdAndReleasedFalse(mission.getId()));
        bumpDispatchVersion(mission);
        events.save(new MissionEvent(mission, type, user(authentication.getName()), oldStatus, mission.getStatus(), reason, metadata));
        audit.record(null, authentication.getName(), AuditAction.ASSIGN, "MISSION", mission.getId().toString(), type + ":" + detail + ":" + reason);
    }

    private void bumpDispatchVersion(Mission mission) {
        // Reservations are separate entities: even a quantity-only change must invalidate open dispatch forms.
        if (entityManager != null) entityManager.lock(mission, jakarta.persistence.LockModeType.PESSIMISTIC_FORCE_INCREMENT);
    }

    private AppUser lockOperator(Long id) {
        AppUser operator = users.findByIdForUpdate(id).orElseThrow(() -> SystemException.notFound("Operator not found"));
        if (entityManager != null) entityManager.refresh(operator);
        return operator;
    }

    private boolean eligibleOperator(AppUser operator) {
        return operator.getRole() == UserRole.ROLE_OPERATOR && operator.isEnabled() && operator.isAccountNonLocked();
    }

    private void requireOperatorAvailable(AppUser operator, Mission mission) {
        if (!eligibleOperator(operator)) throw SystemException.conflict("OPERATOR_NOT_AVAILABLE");
        if (missions.exists(MissionSpecifications.overlappingOperator(operator.getId(), excludedStatuses(), mission.getStartTime(), mission.getExpectedEndTime())
                .and((root, query, cb) -> cb.notEqual(root.get("id"), mission.getId())))) throw SystemException.conflict("OPERATOR_TIME_CONFLICT");
    }

    private Equipment lockEquipment(Long id) {
        Equipment item = equipment.findByIdForUpdate(id).orElseThrow(() -> SystemException.notFound("Equipment not found"));
        if (entityManager != null) entityManager.refresh(item);
        return item;
    }

    private List<MissionEquipmentReservation> activeReservationsLocked(Long id) {
        var active = reservations.findByMissionIdAndReleasedFalse(id);
        active.stream().map(r -> r.getEquipment().getId()).distinct().sorted().forEach(this::lockEquipment);
        return active;
    }

    private boolean sameStation(Station missionStation, Station resourceStation) {
        // Unstationed shared assets retain the existing assign-UAV policy.
        return missionStation == null || resourceStation == null || missionStation.getId().equals(resourceStation.getId());
    }

    private void validatePreflightResources(Mission mission) {
        if (mission.getUav() != null && mission.getUav().getId() != null) lockUav(mission.getUav().getId());
        requireExclusiveUavOwnership(mission);
        if (mission.getOperator() != null) requireOperatorAvailable(lockOperator(mission.getOperator().getId()), mission);
        var active = activeReservationsLocked(mission.getId());
        boolean equipmentValid = !active.isEmpty() && active.stream().allMatch(r -> r.getEquipment().getStatus() == EquipmentStatus.ACTIVE
                && r.getEquipment().getReservedQuantity() >= reservations.activeQuantity(r.getEquipment().getId())
                && sameStation(mission.getStation(), r.getEquipment().getStation()));
        if (!mission.hasRequiredResources(equipmentValid) || mission.getStation().getStatus() != StationStatus.ACTIVE
                || !sameStation(mission.getStation(), mission.getUav().getStation())
                || (mission.getUav().getStatus() != UavStatus.ASSIGNED && mission.getUav().getStatus() != UavStatus.AVAILABLE)) {
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        }
    }

    @Override
    public MissionResponse confirm(Long id, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        MissionStatus old = mission.getStatus(); mission.transitionTo(MissionStatus.CONFIRMED);
        event(mission, MissionEventType.STATUS_CHANGED, authentication, old, mission.getStatus(), "Mission confirmed");
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "CONFIRMED");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse reject(Long id, String reason, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        if (reason != null && reason.length() > 500) throw new IllegalArgumentException("Lý do từ chối không được vượt quá 500 ký tự.");
        MissionStatus old = mission.getStatus();
        mission.transitionTo(MissionStatus.REJECTED);
        releaseResources(mission, authentication.getName());
        event(mission, MissionEventType.REJECTED, authentication, old, mission.getStatus(), reason);
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "REJECTED:" + reason);
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse ready(Long id, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        if (mission.getStatus() != MissionStatus.RESOURCE_RESERVED) throw new IllegalStateException("MISSION_INVALID_STATUS");
        validatePreflightResources(mission);
        requireAcceptance(mission);
        MissionStatus old = mission.getStatus(); mission.transitionTo(MissionStatus.READY);
        event(mission, MissionEventType.STATUS_CHANGED, authentication, old, mission.getStatus(), "Mission ready");
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "READY");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse start(Long id, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        requireAssignedOperator(mission, authentication);
        if (mission.getStatus() != MissionStatus.READY) throw new IllegalStateException("MISSION_INVALID_STATUS");
        validatePreflightResources(mission);
        requireAcceptance(mission);
        MissionStatus old = mission.getStatus(); mission.transitionTo(MissionStatus.IN_PROGRESS);
        changeUavStatus(mission.getUav(), UavStatus.IN_USE, "Mission started", authentication.getName());
        event(mission, MissionEventType.STATUS_CHANGED, authentication, old, mission.getStatus(), "Mission started");
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "IN_PROGRESS");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse complete(Long id, MissionCompletionRequest request, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        requireAssignedOperator(mission, authentication);
        if (mission.getStatus() != MissionStatus.IN_PROGRESS) throw new IllegalStateException("MISSION_INVALID_STATUS");
        if (request == null || request.completionNote() == null || request.completionNote().isBlank()
                || request.equipmentCondition() == null || request.equipmentCondition().isBlank()
                || request.completionNote().length() > 500 || request.equipmentCondition().length() > 500) {
            throw SystemException.badRequest("MISSION_HANDOVER_NOTES_REQUIRED");
        }
        boolean needsResult = java.util.Set.of(MissionType.AREA_INSPECTION, MissionType.AERIAL_RECORDING,
                MissionType.DATA_COLLECTION).contains(mission.getMissionType());
        if (needsResult && (missionMedia == null || !missionMedia.existsByMissionIdAndMediaRoleInAndMediaConfirmedTrueAndMediaDeletedFalse(
                id, java.util.List.of(MediaRole.OUTPUT, MediaRole.DOCUMENT)))) {
            throw SystemException.conflict("MISSION_HANDOVER_RESULT_REQUIRED");
        }
        MissionStatus old = mission.getStatus();
        releaseResources(mission, authentication.getName());
        mission.complete(request.completionNote().trim(), request.equipmentCondition().trim());
        handleMissionCompletionBillingAndQuota(mission);
        event(mission, MissionEventType.COMPLETED, authentication, old, mission.getStatus(), request.completionNote().trim());
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "COMPLETED");
        return MissionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse fail(Long id, MissionFailureRequest request, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
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
        Mission mission = accessibleForUpdate(id, authentication);
        mission.requireMediaWritable();
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
                .filter(this::eligibleOperator)
                .map(item -> !missions.exists(MissionSpecifications.overlappingOperator(item.getId(), excludedStatuses(), startTime, endTime))).orElse(false);
        boolean available = stationAvailable && uavAvailable && operatorAvailable;
        return new MissionAvailabilityResponse(available, stationAvailable, uavAvailable, operatorAvailable,
                available ? "AVAILABLE" : "MISSION_TIME_CONFLICT");
    }

    @Override
    public MissionResponse acceptOperator(Long id, MissionAcceptanceRequest request, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        requireAssignedOperator(mission, authentication);
        if (mission.getStatus() != MissionStatus.CONFIRMED && mission.getStatus() != MissionStatus.RESOURCE_RESERVED
                && mission.getStatus() != MissionStatus.READY) throw new IllegalStateException("MISSION_INVALID_STATUS");
        if (request == null || request.expectedVersion() == null || request.expectedVersion() < 0) {
            throw SystemException.badRequest("MISSION_ACCEPTANCE_VERSION_REQUIRED");
        }
        if (request.expectedVersion() != mission.getVersion() || mission.isOperatorAccepted()) {
            throw SystemException.conflict("MISSION_ACCEPTANCE_STALE");
        }
        mission.acceptOperator();
        event(mission, MissionEventType.OPERATOR_ACCEPTED, authentication, mission.getStatus(), mission.getStatus(), "Operator accepted assignment");
        audit.record(null, authentication.getName(), AuditAction.STATUS_CHANGE, "MISSION", id.toString(), "OPERATOR_ACCEPTED");
        missions.flush();
        return MissionMapper.toResponse(mission);
    }

    private void requireAcceptance(Mission mission) {
        if (!mission.isOperatorAccepted()) throw SystemException.conflict("MISSION_ACCEPTANCE_REQUIRED");
    }

    @Override
    public MissionResponse reportOperatorConflict(Long id, String note, Authentication authentication) {
        Mission mission = accessibleForUpdate(id, authentication);
        requireAssignedOperator(mission, authentication);
        if (note == null || note.isBlank() || note.length() > 500) throw new IllegalArgumentException("Ghi chú vướng mắc phải có nội dung và không vượt quá 500 ký tự.");
        MissionStatus old = mission.getStatus();
        mission.reportOperatorConflict(note.trim());
        event(mission, MissionEventType.OPERATOR_CONFLICT, authentication, old, mission.getStatus(), note.trim());
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

    private Mission accessibleForUpdate(Long id, Authentication authentication) {
        Mission mission = missions.findByIdForUpdate(id).orElseThrow(() -> SystemException.notFound("MISSION_NOT_FOUND"));
        if (entityManager != null) entityManager.refresh(mission);
        enforceVisibility(mission, authentication);
        return mission;
    }

    private Uav lockUav(Long id) {
        Uav uav = uavs.findByIdForUpdate(id).orElseThrow(() -> SystemException.notFound("UAV not found"));
        if (entityManager != null) entityManager.refresh(uav);
        return uav;
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
        Uav aircraft = mission.getUav() == null ? null : mission.getUav().getId() == null ? mission.getUav() : lockUav(mission.getUav().getId());
        if (reservations != null && inventory != null) {
            for (MissionEquipmentReservation reservation : activeReservationsLocked(mission.getId())) {
                Equipment item = reservation.getEquipment();
                if (item.getReservedQuantity() < reservations.activeQuantity(item.getId())) throw SystemException.conflict("MISSION_RESERVATION_BALANCE_CONFLICT");
                reservation.release();
                inventory.release(item.getId(), new QuantityRequest(reservation.getQuantity(), "Mission released"), actor);
            }
        }
        if (aircraft != null && (aircraft.getStatus() == UavStatus.ASSIGNED || aircraft.getStatus() == UavStatus.IN_USE)
                && !missions.existsByUavIdAndIdNotAndStatusNotIn(aircraft.getId(), mission.getId(), excludedStatuses())) {
            changeUavStatus(aircraft, UavStatus.AVAILABLE, "Mission resources released", actor);
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

    private void requireExclusiveUavOwnership(Mission mission) {
        if (mission.getUav() != null && missions.existsByUavIdAndIdNotAndStatusNotIn(
                mission.getUav().getId(), mission.getId(), excludedStatuses())) {
            throw SystemException.conflict("UAV_NOT_AVAILABLE");
        }
    }

    private void requireAssignedOperator(Mission mission, Authentication authentication) {
        if (mission.getOperator() == null || authentication == null || !mission.getOperator().getUsername().equals(authentication.getName())) {
            throw new org.springframework.security.access.AccessDeniedException("Assigned operator required");
        }
    }

    private void changeUavStatus(Uav uav, UavStatus status, String reason, String actor) {
        if (uavService != null && uav.getId() != null) uavService.changeMissionStatus(uav.getId(), status, reason, actor);
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

    private double calculateDurationHours(java.time.LocalDateTime start, java.time.LocalDateTime end) {
        if (start == null || end == null || !end.isAfter(start)) {
            return 1.0;
        }
        long minutes = java.time.Duration.between(start, end).toMinutes();
        return Math.max(0.5, Math.min(24.0, Math.round((minutes / 60.0) * 10.0) / 10.0));
    }

    private void handleMissionCompletionBillingAndQuota(Mission mission) {
        if (mission.getCustomer() == null || mission.getCustomer().getId() == null) {
            return;
        }
        double hoursUsed = calculateDurationHours(mission.getStartTime(), mission.getExpectedEndTime());
        if (quotaService != null) {
            quotaService.recordMissionUsage(mission.getCustomer().getId(), hoursUsed);
        }
        boolean autoInvoice = true;
        if (systemConfigService != null) {
            autoInvoice = Boolean.parseBoolean(systemConfigService.valueOrDefault("billing.auto_generate_invoice", "true"));
        }
        if (autoInvoice && invoiceRepository != null) {
            try {
                String code = "INV-" + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"))
                        + "-" + java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                java.math.BigDecimal amount = java.math.BigDecimal.valueOf(Math.round(hoursUsed * 1_500_000.0));
                com.uav.platform.modules.billing.entity.Invoice invoice = new com.uav.platform.modules.billing.entity.Invoice(
                        code,
                        mission.getCustomer(),
                        mission,
                        null,
                        amount,
                        java.time.LocalDateTime.now().plusDays(7),
                        "Auto-generated invoice for completed mission " + mission.getCode()
                );
                invoiceRepository.save(invoice);
                if (notifications != null) {
                    notifications.sendNotification(new CreateNotificationRequest(
                            mission.getCustomer().getId(),
                            "Invoice Issued - " + code,
                            "Auto-generated invoice for completed mission " + mission.getCode() + " (" + hoursUsed + " flight hours)",
                            NotificationType.PAYMENT,
                            "MISSION",
                            mission.getId()
                    ));
                }
            } catch (RuntimeException ignored) {
            }
        }
    }

    private Mission find(Long id) { return missions.findById(id).orElseThrow(() -> SystemException.notFound("MISSION_NOT_FOUND")); }
    private AppUser user(String username) { return users.findByUsername(username).orElseThrow(() -> SystemException.notFound("User not found")); }
}
