package com.uav.platform.service.impl;

import com.uav.platform.dao.IEquipmentDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IMissionEquipmentReservationDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.request.QuantityRequest;
import com.uav.platform.entity.*;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Equipment;
import com.uav.platform.entity.Station;
import com.uav.platform.entity.Uav;
import com.uav.platform.enums.*;
import com.uav.platform.enums.EquipmentStatus;
import com.uav.platform.enums.StationStatus;
import com.uav.platform.enums.UavStatus;
import com.uav.platform.enums.UserRole;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.InventoryService;
import com.uav.platform.service.MissionResourceService;
import com.uav.platform.specification.MissionSpecifications;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

/** Resource locks and release rules shared by dispatch and lifecycle workflows. */
@Service
@RequiredArgsConstructor
public class MissionResourceServiceImpl implements MissionResourceService {
    private final jakarta.persistence.EntityManager entityManager;
    private final IMissionDao missions;
    private final IUserDao users;
    private final IUavDao uavs;
    private final IEquipmentDao equipment;
    private final InventoryService inventory;
    private final IMissionEquipmentReservationDao reservations;
    private final com.uav.platform.service.UavService uavService;

    @Override
    public AppUser lockOperator(Long id) {
        AppUser operator =
                users.findByIdForUpdate(id)
                        .orElseThrow(() -> SystemException.notFound("Operator not found"));
        if (entityManager != null) entityManager.refresh(operator);
        return operator;
    }

    @Override
    public boolean eligibleOperator(AppUser operator) {
        return operator.getRole() == UserRole.ROLE_OPERATOR
                && UserAccountServiceImpl.isEnabled(operator)
                && UserAccountServiceImpl.isAccountNonLocked(operator);
    }

    @Override
    public void requireOperatorAvailable(AppUser operator, Mission mission) {
        if (!eligibleOperator(operator)) throw SystemException.conflict("OPERATOR_NOT_AVAILABLE");
        requireOperatorFreeFor(operator, mission);
    }

    @Override
    public boolean isUavFreeFor(Uav uav, Mission mission) {
        return !missions.exists(
                MissionSpecifications.overlappingUav(
                                uav.getId(),
                                excludedStatuses(),
                                mission.getStartTime(),
                                mission.getExpectedEndTime())
                        .and((root, query, cb) -> cb.notEqual(root.get("id"), mission.getId())));
    }

    @Override
    public void requireUavFreeFor(Uav uav, Mission mission) {
        if (!isUavFreeFor(uav, mission)) {
            throw SystemException.conflict(
                    "Thiết bị bay đã được phân công cho đơn khác trùng khung giờ.",
                    "UAV_TIME_CONFLICT");
        }
    }

    @Override
    public void requireOperatorFreeFor(AppUser operator, Mission mission) {
        if (missions.exists(
                MissionSpecifications.overlappingOperator(
                                operator.getId(),
                                excludedStatuses(),
                                mission.getStartTime(),
                                mission.getExpectedEndTime())
                        .and((root, query, cb) -> cb.notEqual(root.get("id"), mission.getId())))) {
            throw SystemException.conflict(
                    "Kỹ sư đã được phân công cho đơn khác trùng khung giờ.",
                    "OPERATOR_TIME_CONFLICT");
        }
    }

    @Override
    public Equipment lockEquipment(Long id) {
        Equipment item =
                equipment
                        .findByIdForUpdate(id)
                        .orElseThrow(() -> SystemException.notFound("Equipment not found"));
        if (entityManager != null) entityManager.refresh(item);
        return item;
    }

    @Override
    public List<MissionEquipmentReservation> activeReservationsLocked(Long id) {
        var active = reservations.findByMissionIdAndReleasedFalse(id);
        active.stream()
                .map(r -> r.getEquipment().getId())
                .distinct()
                .sorted()
                .forEach(this::lockEquipment);
        return active;
    }

    @Override
    public boolean sameStation(Station missionStation, Station resourceStation) {
        // Unstationed shared assets retain the existing assign-UAV policy.
        return missionStation == null
                || resourceStation == null
                || missionStation.getId().equals(resourceStation.getId());
    }

    @Override
    public void validatePreflightResources(Mission mission) {
        if (mission.getUav() != null && mission.getUav().getId() != null)
            lockUav(mission.getUav().getId());
        requireExclusiveUavOwnership(mission);
        if (mission.getOperator() != null)
            requireOperatorAvailable(lockOperator(mission.getOperator().getId()), mission);
        var active = activeReservationsLocked(mission.getId());
        boolean equipmentValid =
                !active.isEmpty()
                        && active.stream()
                                .allMatch(
                                        r ->
                                                r.getEquipment().getStatus()
                                                                == EquipmentStatus.ACTIVE
                                                        && r.getEquipment().getReservedQuantity()
                                                                >= reservations.activeQuantity(
                                                                        r.getEquipment().getId())
                                                        && sameStation(
                                                                mission.getStation(),
                                                                r.getEquipment().getStation()));
        if (!MissionOperations.hasRequiredResources(mission, equipmentValid)
                || mission.getStation().getStatus() != StationStatus.ACTIVE
                || !sameStation(mission.getStation(), mission.getUav().getStation())
                || (mission.getUav().getStatus() != UavStatus.ASSIGNED
                        && mission.getUav().getStatus() != UavStatus.AVAILABLE)) {
            throw SystemException.conflict("MISSION_RESOURCE_MISSING");
        }
    }

    @Override
    public Uav lockUav(Long id) {
        Uav uav =
                uavs.findByIdForUpdate(id)
                        .orElseThrow(() -> SystemException.notFound("UAV not found"));
        if (entityManager != null) entityManager.refresh(uav);
        return uav;
    }

    @Override
    public List<MissionStatus> excludedStatuses() {
        return List.of(
                MissionStatus.CANCELLED,
                MissionStatus.COMPLETED,
                MissionStatus.FAILED,
                MissionStatus.REJECTED);
    }

    @Override
    public void releaseResources(Mission mission, String actor) {
        Uav aircraft =
                mission.getUav() == null
                        ? null
                        : mission.getUav().getId() == null
                                ? mission.getUav()
                                : lockUav(mission.getUav().getId());
        if (reservations != null && inventory != null) {
            for (MissionEquipmentReservation reservation :
                    activeReservationsLocked(mission.getId())) {
                Equipment item = reservation.getEquipment();
                if (item.getReservedQuantity() < reservations.activeQuantity(item.getId()))
                    throw SystemException.conflict("MISSION_RESERVATION_BALANCE_CONFLICT");
                MissionEquipmentReservationOperations.release(reservation);
                inventory.release(
                        item.getId(),
                        new QuantityRequest(reservation.getQuantity(), "Mission released"),
                        actor);
            }
        }
        if (aircraft != null
                && (aircraft.getStatus() == UavStatus.ASSIGNED
                        || aircraft.getStatus() == UavStatus.IN_USE)
                && !missions.existsByUavIdAndIdNotAndStatusNotIn(
                        aircraft.getId(), mission.getId(), excludedStatuses())) {
            changeUavStatus(aircraft, UavStatus.AVAILABLE, "Mission resources released", actor);
        }
    }

    @Override
    public void requireExclusiveUavOwnership(Mission mission) {
        if (mission.getUav() != null
                && missions.existsByUavIdAndIdNotAndStatusNotIn(
                        mission.getUav().getId(), mission.getId(), excludedStatuses())) {
            throw SystemException.conflict("UAV_NOT_AVAILABLE");
        }
    }

    @Override
    public void changeUavStatus(Uav uav, UavStatus status, String reason, String actor) {
        if (uavService != null && uav.getId() != null)
            uavService.changeMissionStatus(uav.getId(), status, reason, actor);
        else uav.setStatus(status);
    }
}
