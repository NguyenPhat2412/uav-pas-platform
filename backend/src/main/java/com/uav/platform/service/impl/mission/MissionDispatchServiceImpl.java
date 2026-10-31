package com.uav.platform.service.impl.mission;

import com.uav.platform.dto.request.inventory.QuantityRequest;
import com.uav.platform.dto.request.mission.*;
import com.uav.platform.dto.response.mission.*;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.entity.mission.*;
import com.uav.platform.entity.station.Station;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.inventory.EquipmentStatus;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.StationStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.mission.MissionMapper;
import com.uav.platform.repository.mission.MissionEquipmentReservationRepository;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.inventory.InventoryService;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.mission.MissionDispatchService;
import com.uav.platform.service.mission.MissionEventService;
import com.uav.platform.service.mission.MissionResourceService;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.specification.mission.MissionSpecifications;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Assigns and redispatches resources without changing lock ordering or version checks. */
@Service
@Transactional
@RequiredArgsConstructor
public class MissionDispatchServiceImpl implements MissionDispatchService {
    private final jakarta.persistence.EntityManager entityManager;
    private final MissionRepository missions;
    private final PermissionService permissions;
    private final AuditLogService audit;
    private final MissionEventRepository events;
    private final StationRepository stations;
    private final InventoryService inventory;
    private final MissionEquipmentReservationRepository reservations;
    private final MissionAccessService access;
    private final MissionEventService missionEvents;
    private final MissionResourceService resources;
    private final MissionMapper missionMapper;

    @Override
    public MissionResponse assignStation(
            Long id, ResourceAssignmentRequest request, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        ensureResourceAssignmentAllowed(mission);
        if (mission.getStation() != null)
            throw SystemException.conflict("MISSION_DISPATCH_REQUIRED");
        Station station =
                stations.findById(request.resourceId())
                        .orElseThrow(() -> SystemException.notFound("Station not found"));
        if (station.getStatus() != StationStatus.ACTIVE)
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        if (mission.getUav() != null
                && mission.getUav().getStation() != null
                && !station.getId().equals(mission.getUav().getStation().getId())) {
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        }
        if (reservations != null
                && resources.activeReservationsLocked(id).stream()
                        .anyMatch(
                                r ->
                                        !resources.sameStation(
                                                station, r.getEquipment().getStation()))) {
            throw SystemException.conflict("MISSION_STATION_RESOURCES_CONFLICT");
        }
        MissionOperations.assignStation(mission, station);
        MissionOperations.invalidateAcceptance(mission);
        missionEvents.record(
                mission,
                MissionEventType.STATION_ASSIGNED,
                authentication,
                mission.getStatus(),
                mission.getStatus(),
                "Station assigned");
        maybeMarkResourcesReserved(mission, authentication);
        audit.record(
                null,
                authentication.getName(),
                AuditAction.ASSIGN,
                "MISSION",
                id.toString(),
                "STATION:" + station.getCode());
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse assignUav(
            Long id, ResourceAssignmentRequest request, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        ensureResourceAssignmentAllowed(mission);
        if (mission.getUav() != null && !mission.getUav().getId().equals(request.resourceId()))
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        Uav uav = resources.lockUav(request.resourceId());
        if (uav.getStatus() != UavStatus.AVAILABLE
                || missions.existsByUavIdAndIdNotAndStatusNotIn(
                        uav.getId(), mission.getId(), resources.excludedStatuses())) {
            throw SystemException.conflict("UAV_NOT_AVAILABLE");
        }
        if (mission.getStation() != null
                && uav.getStation() != null
                && !mission.getStation().getId().equals(uav.getStation().getId())) {
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        }
        if (missions.exists(
                MissionSpecifications.overlappingUav(
                        uav.getId(),
                        resources.excludedStatuses(),
                        mission.getStartTime(),
                        mission.getExpectedEndTime()))) {
            throw SystemException.conflict("UAV_TIME_CONFLICT");
        }
        MissionOperations.assignUav(mission, uav);
        MissionOperations.invalidateAcceptance(mission);
        resources.changeUavStatus(
                uav, UavStatus.ASSIGNED, "Mission UAV assigned", authentication.getName());
        missionEvents.record(
                mission,
                MissionEventType.UAV_ASSIGNED,
                authentication,
                mission.getStatus(),
                mission.getStatus(),
                "UAV assigned");
        maybeMarkResourcesReserved(mission, authentication);
        audit.record(
                null,
                authentication.getName(),
                AuditAction.ASSIGN,
                "MISSION",
                id.toString(),
                "UAV:" + uav.getSerialNumber());
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse replaceUav(
            Long id, MissionUavReplacementRequest request, Authentication authentication) {
        requireUavDispatchPermission(authentication);
        String reason = dispatchReason(request.reason());
        Mission mission = access.accessibleForUpdate(id, authentication);
        requireCurrentUav(mission, request.expectedCurrentUavId());
        if (request.replacementUavId() == null
                || request.replacementUavId() <= 0
                || request.replacementUavId().equals(request.expectedCurrentUavId())) {
            throw SystemException.badRequest(
                            "Hãy chọn một UAV khác UAV hiện tại.", "UAV_REPLACEMENT_MUST_DIFFER")
                    .at("replacementUavId");
        }
        // Lock both rows in ID order so concurrent swaps cannot deadlock each other.
        Long firstId = Math.min(request.expectedCurrentUavId(), request.replacementUavId());
        Long secondId = Math.max(request.expectedCurrentUavId(), request.replacementUavId());
        Uav first = resources.lockUav(firstId);
        Uav second = resources.lockUav(secondId);
        Uav previous = firstId.equals(request.expectedCurrentUavId()) ? first : second;
        Uav replacement = firstId.equals(request.replacementUavId()) ? first : second;
        if (previous.getStatus() == UavStatus.IN_USE)
            throw SystemException.conflict("UAV_NOT_AVAILABLE");
        if (replacement.getStatus() != UavStatus.AVAILABLE
                || missions.existsByUavIdAndIdNotAndStatusNotIn(
                        replacement.getId(), id, resources.excludedStatuses())) {
            throw SystemException.conflict("UAV_NOT_AVAILABLE");
        }
        if ((mission.getStation() != null
                        && mission.getStation().getStatus() != StationStatus.ACTIVE)
                || (replacement.getStation() != null
                        && replacement.getStation().getStatus() != StationStatus.ACTIVE)
                || (mission.getStation() != null
                        && replacement.getStation() != null
                        && !mission.getStation()
                                .getId()
                                .equals(replacement.getStation().getId()))) {
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        }
        if (missions.exists(
                MissionSpecifications.overlappingUav(
                        replacement.getId(),
                        resources.excludedStatuses(),
                        mission.getStartTime(),
                        mission.getExpectedEndTime()))) {
            throw SystemException.conflict("UAV_TIME_CONFLICT");
        }
        MissionStatus oldStatus = mission.getStatus();
        MissionOperations.redispatchUav(
                mission, replacement, reservations.existsByMissionIdAndReleasedFalse(id));
        resources.changeUavStatus(
                replacement,
                UavStatus.ASSIGNED,
                "Mission UAV replaced: " + id,
                authentication.getName());
        releasePreviousUav(previous, id, authentication.getName());
        recordRedispatch(
                mission,
                MissionEventType.UAV_REPLACED,
                oldStatus,
                previous.getId(),
                replacement.getId(),
                reason,
                authentication);
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse unassignUav(
            Long id, MissionUavUnassignmentRequest request, Authentication authentication) {
        requireUavDispatchPermission(authentication);
        String reason = dispatchReason(request.reason());
        Mission mission = access.accessibleForUpdate(id, authentication);
        requireCurrentUav(mission, request.expectedCurrentUavId());
        Uav previous = resources.lockUav(request.expectedCurrentUavId());
        if (previous.getStatus() == UavStatus.IN_USE)
            throw SystemException.conflict("UAV_NOT_AVAILABLE");
        MissionStatus oldStatus = mission.getStatus();
        MissionOperations.redispatchUav(
                mission, null, reservations.existsByMissionIdAndReleasedFalse(id));
        releasePreviousUav(previous, id, authentication.getName());
        recordRedispatch(
                mission,
                MissionEventType.UAV_UNASSIGNED,
                oldStatus,
                previous.getId(),
                null,
                reason,
                authentication);
        return missionMapper.toResponse(mission);
    }

    @Override
    public void requireUavDispatchPermission(Authentication authentication) {
        if (!permissions.has(authentication, "MISSION_ASSIGN_UAV")) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "UAV dispatch is not permitted");
        }
    }

    @Override
    public String dispatchReason(String reason) {
        if (reason == null || reason.isBlank() || reason.length() > 500)
            throw SystemException.badRequest("UAV_DISPATCH_REASON_REQUIRED");
        return reason.trim();
    }

    @Override
    public void requireCurrentUav(Mission mission, Long expectedId) {
        if (mission.getStatus() != MissionStatus.CONFIRMED
                && mission.getStatus() != MissionStatus.RESOURCE_RESERVED
                && mission.getStatus() != MissionStatus.READY)
            throw SystemException.conflict("MISSION_INVALID_STATUS");
        if (expectedId == null || expectedId <= 0)
            throw SystemException.badRequest("UAV_DISPATCH_EXPECTED_ID_REQUIRED");
        if (mission.getUav() == null || !mission.getUav().getId().equals(expectedId)) {
            throw SystemException.conflict("MISSION_UAV_ASSIGNMENT_STALE");
        }
    }

    @Override
    public void releasePreviousUav(Uav previous, Long missionId, String actor) {
        if (previous.getStatus() == UavStatus.ASSIGNED
                && !missions.existsByUavIdAndIdNotAndStatusNotIn(
                        previous.getId(), missionId, resources.excludedStatuses())) {
            resources.changeUavStatus(
                    previous, UavStatus.AVAILABLE, "Mission UAV released: " + missionId, actor);
        }
    }

    @Override
    public void recordRedispatch(
            Mission mission,
            MissionEventType type,
            MissionStatus oldStatus,
            Long previousId,
            Long replacementId,
            String reason,
            Authentication authentication) {
        String metadata =
                "{\"previousUavId\":" + previousId + ",\"replacementUavId\":" + replacementId + "}";
        events.save(
                new MissionEvent(
                        mission,
                        type,
                        access.user(authentication.getName()),
                        oldStatus,
                        mission.getStatus(),
                        reason,
                        metadata));
        audit.record(
                null,
                authentication.getName(),
                AuditAction.ASSIGN,
                "MISSION",
                mission.getId().toString(),
                type + ":" + previousId + "->" + replacementId + ":" + reason);
    }

    @Override
    public MissionResponse assignOperator(
            Long id, ResourceAssignmentRequest request, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        ensureResourceAssignmentAllowed(mission);
        if (mission.getOperator() != null
                && !mission.getOperator().getId().equals(request.resourceId()))
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        AppUser operator = resources.lockOperator(request.resourceId());
        resources.requireOperatorAvailable(operator, mission);
        MissionOperations.assignOperator(mission, operator);
        MissionOperations.invalidateAcceptance(mission);
        missionEvents.record(
                mission,
                MissionEventType.OPERATOR_ASSIGNED,
                authentication,
                mission.getStatus(),
                mission.getStatus(),
                "Operator assigned");
        maybeMarkResourcesReserved(mission, authentication);
        audit.record(
                operator.getId(),
                authentication.getName(),
                AuditAction.ASSIGN,
                "MISSION",
                id.toString(),
                "OPERATOR:" + operator.getUsername());
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse reserveEquipment(
            Long id, ResourceAssignmentRequest request, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        ensureResourceAssignmentAllowed(mission);
        Equipment item = resources.lockEquipment(request.resourceId());
        if (!resources.sameStation(mission.getStation(), item.getStation()))
            throw SystemException.conflict("MISSION_STATION_RESOURCES_CONFLICT");
        if (item.getStatus() != EquipmentStatus.ACTIVE
                || item.getAvailableQuantity() < request.quantity()) {
            throw SystemException.conflict("INVENTORY_NOT_AVAILABLE");
        }
        inventory.reserve(
                item.getId(),
                new QuantityRequest(request.quantity(), request.note()),
                authentication.getName());
        reservations.save(
                MissionEquipmentReservationOperations.create(
                        mission, item, request.quantity(), authentication.getName()));
        MissionOperations.invalidateAcceptance(mission);
        bumpDispatchVersion(mission);
        missionEvents.record(
                mission,
                MissionEventType.EQUIPMENT_RESERVED,
                authentication,
                mission.getStatus(),
                mission.getStatus(),
                "Equipment reserved");
        maybeMarkResourcesReserved(mission, authentication);
        audit.record(
                null,
                authentication.getName(),
                AuditAction.RESERVE,
                "MISSION",
                id.toString(),
                "EQUIPMENT:" + item.getId());
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionDispatchResourcesResponse dispatchResources(
            Long id, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        return new MissionDispatchResourcesResponse(
                missionMapper.toResponse(mission),
                mission.getVersion(),
                mission.getStation() == null ? null : mission.getStation().getId(),
                mission.getOperator() == null ? null : mission.getOperator().getId(),
                reservations.findByMissionIdOrderByIdAsc(id).stream()
                        .map(
                                r ->
                                        new MissionDispatchResourcesResponse.Reservation(
                                                r.getId(),
                                                r.getEquipment().getId(),
                                                r.getEquipment().getName(),
                                                r.getEquipment().getStation() == null
                                                        ? null
                                                        : r.getEquipment().getStation().getId(),
                                                r.getQuantity(),
                                                r.isReleased(),
                                                r.getReleasedAt()))
                        .toList());
    }

    @Override
    public MissionResponse redispatchOperator(
            Long id, MissionResourceRedispatchRequest request, Authentication authentication) {
        requireDispatchPermission(authentication, "MISSION_ASSIGN_OPERATOR");
        String reason = resourceDispatchReason(request.reason());
        Mission mission = dispatchMission(id, request.expectedVersion(), authentication);
        Long oldId = mission.getOperator() == null ? null : mission.getOperator().getId();
        requireDifferentResource(oldId, request.replacementId());
        // Stable ordering serializes both replacements and ordinary assignments of the same
        // operator.
        java.util.stream.Stream.of(oldId, request.replacementId())
                .filter(java.util.Objects::nonNull)
                .distinct()
                .sorted()
                .forEach(resources::lockOperator);
        AppUser replacement =
                request.replacementId() == null
                        ? null
                        : resources.lockOperator(request.replacementId());
        if (replacement != null) resources.requireOperatorAvailable(replacement, mission);
        MissionStatus oldStatus = mission.getStatus();
        MissionOperations.assignOperator(mission, replacement);
        finishResourceDispatch(
                mission,
                replacement == null
                        ? MissionEventType.OPERATOR_UNASSIGNED
                        : MissionEventType.OPERATOR_REPLACED,
                oldStatus,
                "operator",
                oldId,
                request.replacementId(),
                reason,
                authentication);
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse redispatchStation(
            Long id, MissionResourceRedispatchRequest request, Authentication authentication) {
        requireDispatchPermission(authentication, "MISSION_ASSIGN_STATION");
        String reason = resourceDispatchReason(request.reason());
        Mission mission = dispatchMission(id, request.expectedVersion(), authentication);
        Long oldId = mission.getStation() == null ? null : mission.getStation().getId();
        requireDifferentResource(oldId, request.replacementId());
        Station replacement =
                request.replacementId() == null
                        ? null
                        : stations.findById(request.replacementId())
                                .orElseThrow(() -> SystemException.notFound("Station not found"));
        if (replacement != null && replacement.getStatus() != StationStatus.ACTIVE)
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        if (mission.getUav() != null) {
            Uav aircraft = resources.lockUav(mission.getUav().getId());
            if (replacement == null || !resources.sameStation(replacement, aircraft.getStation()))
                throw SystemException.conflict("MISSION_STATION_RESOURCES_CONFLICT");
        }
        var active = resources.activeReservationsLocked(id);
        if (active.stream()
                .anyMatch(
                        r ->
                                replacement == null
                                        || !resources.sameStation(
                                                replacement, r.getEquipment().getStation()))) {
            throw SystemException.conflict("MISSION_STATION_RESOURCES_CONFLICT");
        }
        MissionStatus oldStatus = mission.getStatus();
        MissionOperations.assignStation(mission, replacement);
        finishResourceDispatch(
                mission,
                replacement == null
                        ? MissionEventType.STATION_UNASSIGNED
                        : MissionEventType.STATION_REPLACED,
                oldStatus,
                "station",
                oldId,
                request.replacementId(),
                reason,
                authentication);
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse redispatchEquipment(
            Long id, MissionEquipmentRedispatchRequest request, Authentication authentication) {
        requireDispatchPermission(authentication, "MISSION_RESERVE_EQUIPMENT");
        String reason = resourceDispatchReason(request.reason());
        Mission mission = dispatchMission(id, request.expectedVersion(), authentication);
        MissionEquipmentReservation previous =
                reservations
                        .findById(request.reservationId())
                        .filter(r -> r.getMission().getId().equals(id) && !r.isReleased())
                        .orElseThrow(() -> SystemException.conflict("MISSION_RESERVATION_STALE"));
        if (request.replacementId() != null
                && (request.replacementId() <= 0
                        || request.quantity() == null
                        || request.quantity() <= 0)) {
            throw SystemException.badRequest(
                            "Số lượng thiết bị không hợp lệ hoặc vượt quá lượng còn khả dụng.",
                            "MISSION_EQUIPMENT_QUANTITY_INVALID")
                    .at("quantity");
        }
        if (request.replacementId() == null && request.quantity() != null)
            throw SystemException.badRequest(
                            "Số lượng thiết bị không hợp lệ hoặc vượt quá lượng còn khả dụng.",
                            "MISSION_EQUIPMENT_QUANTITY_INVALID")
                    .at("quantity");
        Long oldId = previous.getEquipment().getId();
        java.util.stream.Stream.of(oldId, request.replacementId())
                .filter(java.util.Objects::nonNull)
                .distinct()
                .sorted()
                .forEach(resources::lockEquipment);
        Equipment oldItem = previous.getEquipment();
        Equipment replacement =
                request.replacementId() == null
                        ? null
                        : resources.lockEquipment(request.replacementId());
        if (replacement != null) {
            if (oldId.equals(replacement.getId()) && previous.getQuantity() == request.quantity())
                throw SystemException.badRequest("MISSION_RESOURCE_UNCHANGED");
            int available =
                    replacement.getAvailableQuantity()
                            + (oldId.equals(replacement.getId()) ? previous.getQuantity() : 0);
            if (replacement.getStatus() != EquipmentStatus.ACTIVE || available < request.quantity())
                throw SystemException.conflict("INVENTORY_NOT_AVAILABLE");
            if (!resources.sameStation(mission.getStation(), replacement.getStation()))
                throw SystemException.conflict("MISSION_STATION_RESOURCES_CONFLICT");
        }
        if (oldItem.getReservedQuantity() < reservations.activeQuantity(oldId))
            throw SystemException.conflict("MISSION_RESERVATION_BALANCE_CONFLICT");
        // Mark released inside this transaction before inventory checks the remaining mission-owned
        // quantity.
        MissionEquipmentReservationOperations.release(previous);
        // The full reason belongs to the 500-character mission timeline. Inventory notes are
        // limited to 255.
        String movementNote =
                "Mission #"
                        + id
                        + " redispatch reservation #"
                        + previous.getId()
                        + "; see mission timeline";
        inventory.release(
                oldId,
                new QuantityRequest(previous.getQuantity(), movementNote),
                authentication.getName());
        MissionEquipmentReservation next = null;
        if (replacement != null) {
            inventory.reserve(
                    replacement.getId(),
                    new QuantityRequest(request.quantity(), movementNote),
                    authentication.getName());
            next =
                    reservations.save(
                            MissionEquipmentReservationOperations.create(
                                    mission,
                                    replacement,
                                    request.quantity(),
                                    authentication.getName()));
        }
        MissionEventType type =
                replacement == null
                        ? MissionEventType.EQUIPMENT_RELEASED
                        : MissionEventType.EQUIPMENT_CHANGED;
        String metadata =
                "{\"previousReservationId\":"
                        + previous.getId()
                        + ",\"previousEquipmentId\":"
                        + oldId
                        + ",\"previousQuantity\":"
                        + previous.getQuantity()
                        + ",\"replacementReservationId\":"
                        + (next == null ? null : next.getId())
                        + ",\"replacementEquipmentId\":"
                        + request.replacementId()
                        + ",\"replacementQuantity\":"
                        + (next == null ? 0 : next.getQuantity())
                        + "}";
        recordResourceDispatch(
                mission,
                type,
                mission.getStatus(),
                metadata,
                "khoản #"
                        + previous.getId()
                        + " (thiết bị #"
                        + oldId
                        + " × "
                        + previous.getQuantity()
                        + ") → "
                        + (next == null
                                ? "hoàn trả"
                                : "khoản #"
                                        + next.getId()
                                        + " (thiết bị #"
                                        + next.getEquipment().getId()
                                        + " × "
                                        + next.getQuantity()
                                        + ")"),
                reason,
                authentication);
        return missionMapper.toResponse(mission);
    }

    @Override
    public Mission dispatchMission(Long id, Long version, Authentication authentication) {
        Mission mission = access.accessibleForUpdate(id, authentication);
        if (!List.of(MissionStatus.CONFIRMED, MissionStatus.RESOURCE_RESERVED, MissionStatus.READY)
                .contains(mission.getStatus())) {
            throw SystemException.conflict("MISSION_INVALID_STATUS");
        }
        if (version == null || version < 0)
            throw SystemException.badRequest("MISSION_DISPATCH_VERSION_REQUIRED");
        if (mission.getVersion() != version)
            throw SystemException.conflict("MISSION_DISPATCH_STALE");
        return mission;
    }

    @Override
    public void requireDispatchPermission(Authentication authentication, String permission) {
        if (!permissions.has(authentication, permission))
            throw new org.springframework.security.access.AccessDeniedException(
                    "Resource dispatch is not permitted");
    }

    @Override
    public String resourceDispatchReason(String reason) {
        if (reason == null || reason.isBlank() || reason.length() > 500)
            throw SystemException.badRequest("MISSION_DISPATCH_REASON_REQUIRED");
        return reason.trim();
    }

    @Override
    public void requireDifferentResource(Long oldId, Long replacementId) {
        if (java.util.Objects.equals(oldId, replacementId))
            throw SystemException.badRequest("MISSION_RESOURCE_UNCHANGED");
        if (replacementId != null && replacementId <= 0)
            throw SystemException.badRequest("MISSION_RESOURCE_ID_INVALID");
    }

    @Override
    public void finishResourceDispatch(
            Mission mission,
            MissionEventType type,
            MissionStatus oldStatus,
            String resource,
            Long oldId,
            Long replacementId,
            String reason,
            Authentication authentication) {
        String metadata =
                "{\"resource\":\""
                        + resource
                        + "\",\"previousId\":"
                        + oldId
                        + ",\"replacementId\":"
                        + replacementId
                        + "}";
        recordResourceDispatch(
                mission,
                type,
                oldStatus,
                metadata,
                oldId + "->" + replacementId,
                reason,
                authentication);
    }

    @Override
    public void recordResourceDispatch(
            Mission mission,
            MissionEventType type,
            MissionStatus oldStatus,
            String metadata,
            String detail,
            String reason,
            Authentication authentication) {
        MissionOperations.resetDispatch(
                mission, reservations.existsByMissionIdAndReleasedFalse(mission.getId()));
        bumpDispatchVersion(mission);
        events.save(
                new MissionEvent(
                        mission,
                        type,
                        access.user(authentication.getName()),
                        oldStatus,
                        mission.getStatus(),
                        reason,
                        metadata));
        audit.record(
                null,
                authentication.getName(),
                AuditAction.ASSIGN,
                "MISSION",
                mission.getId().toString(),
                type + ":" + detail + ":" + reason);
    }

    @Override
    public void bumpDispatchVersion(Mission mission) {
        // Reservations are separate entities: even a quantity-only change must invalidate open
        // dispatch forms.
        if (entityManager != null)
            entityManager.lock(
                    mission, jakarta.persistence.LockModeType.PESSIMISTIC_FORCE_INCREMENT);
    }

    @Override
    public void ensureResourceAssignmentAllowed(Mission mission) {
        if (mission.getStatus() != MissionStatus.CONFIRMED
                && mission.getStatus() != MissionStatus.RESOURCE_RESERVED) {
            throw SystemException.conflict("MISSION_INVALID_STATUS");
        }
    }

    @Override
    public void maybeMarkResourcesReserved(Mission mission, Authentication authentication) {
        if (mission.getStatus() == MissionStatus.CONFIRMED
                && MissionOperations.hasRequiredResources(
                        mission,
                        reservations != null
                                && reservations.existsByMissionIdAndReleasedFalse(
                                        mission.getId()))) {
            MissionStatus old = mission.getStatus();
            MissionOperations.transitionTo(mission, MissionStatus.RESOURCE_RESERVED);
            missionEvents.record(
                    mission,
                    MissionEventType.STATUS_CHANGED,
                    authentication,
                    old,
                    mission.getStatus(),
                    "Resources reserved");
            audit.record(
                    null,
                    authentication.getName(),
                    AuditAction.STATUS_CHANGE,
                    "MISSION",
                    mission.getId().toString(),
                    "RESOURCE_RESERVED");
        }
    }
}
