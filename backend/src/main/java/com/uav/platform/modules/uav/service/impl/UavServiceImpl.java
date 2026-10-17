package com.uav.platform.modules.uav.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.enums.StationStatus;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.dto.request.UavRequest;
import com.uav.platform.modules.uav.dto.response.UavResponse;
import com.uav.platform.modules.uav.dto.response.UavStatusHistoryResponse;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.entity.UavStatusHistory;
import com.uav.platform.modules.uav.enums.UavStatus;
import com.uav.platform.modules.uav.mapper.UavMapper;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.uav.repository.UavStatusHistoryRepository;
import com.uav.platform.modules.uav.service.UavService;

import jakarta.persistence.EntityManager;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;

@Service
@Transactional
@RequiredArgsConstructor
public class UavServiceImpl implements UavService {
    private final UavRepository repository;
    private final StationRepository stations;
    private final UavStatusHistoryRepository history;
    private final AuditLogService audit;
    private final MissionRepository missions;
    private final EntityManager entityManager;
    private final com.uav.platform.modules.maintenance.repository.RepairOrderRepository
            repairOrders;
    private final UavMapper uavMapper;
    private static final EnumSet<MissionStatus> TERMINAL_MISSIONS =
            EnumSet.of(
                    MissionStatus.COMPLETED,
                    MissionStatus.CANCELLED,
                    MissionStatus.REJECTED,
                    MissionStatus.FAILED);

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UavResponse> list(Pageable pageable) {
        return PageResponse.from(repository.findAll(pageable), uavMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public UavResponse get(Long id) {
        return uavMapper.toResponse(find(id));
    }

    @Override
    public UavResponse create(UavRequest request, String actor) {
        if (repository.existsBySerialNumber(request.serialNumber()))
            throw SystemException.conflict("UAV serial number already exists");
        Uav saved =
                repository.save(
                        new Uav(request.model(), request.serialNumber(), request.manufacturer()));
        history.save(new UavStatusHistory(saved, null, saved.getStatus(), "Created", actor));
        audit.record(
                null,
                actor,
                AuditAction.CREATE,
                "UAV",
                saved.getId().toString(),
                saved.getSerialNumber());
        return uavMapper.toResponse(saved);
    }

    @Override
    public UavResponse update(Long id, UavRequest request, String actor) {
        Uav uav = findForUpdate(id);
        UavOperations.update(uav, request.model(), request.manufacturer());
        audit.record(null, actor, AuditAction.UPDATE, "UAV", id.toString(), uav.getSerialNumber());
        return uavMapper.toResponse(uav);
    }

    @Override
    public UavResponse assign(Long id, Long stationId, String actor) {
        Uav uav = findForUpdate(id);
        requireNoActiveRepair(uav);
        requireIdle(uav);
        if (uav.getStatus() != UavStatus.AVAILABLE)
            throw SystemException.conflict("UAV_NOT_AVAILABLE_FOR_STATION_TRANSFER");
        Station station =
                stations.findById(stationId)
                        .orElseThrow(() -> SystemException.notFound("Station not found"));
        if (station.getStatus() != StationStatus.ACTIVE)
            throw SystemException.conflict("STATION_NOT_ACTIVE");
        Long previousStationId = uav.getStation() == null ? null : uav.getStation().getId();
        if (stationId.equals(previousStationId)) return uavMapper.toResponse(uav);
        uav.setStation(station);
        history.save(
                new UavStatusHistory(
                        uav,
                        uav.getStatus(),
                        uav.getStatus(),
                        "Home station changed: "
                                + (previousStationId == null ? "none" : previousStationId)
                                + " -> "
                                + stationId,
                        actor));
        audit.record(null, actor, AuditAction.ASSIGN, "UAV", id.toString(), station.getCode());
        return uavMapper.toResponse(uav);
    }

    @Override
    public UavResponse changeStatus(Long id, UavStatus status, String reason, String actor) {
        return changeStatus(id, status, reason, null, actor);
    }

    @Override
    public UavResponse changeStatus(
            Long id, UavStatus status, String reason, UavStatus expectedStatus, String actor) {
        Uav uav = findForUpdate(id);
        requireNoActiveRepair(uav);
        checkExpectedStatus(uav, expectedStatus);
        // Legacy home-station assignment used ASSIGNED without a mission. Recovery
        // is explicit and only permitted after checking every nonterminal owner.
        boolean orphanRecovery =
                uav.getStatus() == UavStatus.ASSIGNED
                        && status == UavStatus.AVAILABLE
                        && expectedStatus == UavStatus.ASSIGNED;
        if (orphanRecovery) {
            if (missions.existsByUavIdAndStatusNotIn(uav.getId(), TERMINAL_MISSIONS)) {
                throw SystemException.conflict("UAV_HAS_ACTIVE_MISSION");
            }
        } else {
            requireIdle(uav);
        }
        if (status == null || status == UavStatus.ASSIGNED || status == UavStatus.IN_USE) {
            throw SystemException.conflict("UAV_STATUS_REQUIRES_MISSION_WORKFLOW");
        }
        String checkedReason = requireReason(reason);
        if (status == UavStatus.MAINTENANCE) return startMaintenance(uav, checkedReason, actor);
        changeStatusInternal(uav, status, checkedReason, actor);
        audit.record(null, actor, AuditAction.STATUS_CHANGE, "UAV", id.toString(), status.name());
        return uavMapper.toResponse(uav);
    }

    @Override
    public UavResponse maintenance(Long id, String actor) {
        return maintenance(id, null, null, actor);
    }

    @Override
    public UavResponse maintenance(Long id, String reason, UavStatus expectedStatus, String actor) {
        Uav uav = findForUpdate(id);
        requireNoActiveRepair(uav);
        checkExpectedStatus(uav, expectedStatus);
        requireIdle(uav);
        return startMaintenance(
                uav, reason == null ? "Maintenance started" : requireReason(reason), actor);
    }

    private UavResponse startMaintenance(Uav uav, String reason, String actor) {
        if (uav.getStatus() == UavStatus.MAINTENANCE)
            throw SystemException.conflict("UAV_ALREADY_IN_MAINTENANCE");
        UavStatus previous = uav.getStatus();
        UavOperations.markMaintenance(uav);
        history.save(new UavStatusHistory(uav, previous, UavStatus.MAINTENANCE, reason, actor));
        audit.record(
                null,
                actor,
                AuditAction.STATUS_CHANGE,
                "UAV",
                uav.getId().toString(),
                "MAINTENANCE");
        return uavMapper.toResponse(uav);
    }

    @Override
    public UavResponse changeMissionStatus(Long id, UavStatus status, String reason, String actor) {
        Uav uav = findForUpdate(id);
        requireNoActiveRepair(uav);
        boolean valid =
                (uav.getStatus() == UavStatus.AVAILABLE && status == UavStatus.ASSIGNED)
                        || (uav.getStatus() == UavStatus.ASSIGNED && status == UavStatus.IN_USE)
                        || ((uav.getStatus() == UavStatus.ASSIGNED
                                        || uav.getStatus() == UavStatus.IN_USE)
                                && status == UavStatus.AVAILABLE);
        if (!valid) throw SystemException.conflict("UAV_INVALID_MISSION_TRANSITION");
        changeStatusInternal(uav, status, requireReason(reason), actor);
        audit.record(null, actor, AuditAction.STATUS_CHANGE, "UAV", id.toString(), status.name());
        return uavMapper.toResponse(uav);
    }

    private void requireNoActiveRepair(Uav uav) {
        if (repairOrders.existsByUavIdAndStatus(
                uav.getId(), com.uav.platform.modules.maintenance.enums.RepairStatus.IN_PROGRESS)) {
            throw SystemException.conflict("UAV_HAS_IN_PROGRESS_REPAIR_ORDER");
        }
    }

    private void requireIdle(Uav uav) {
        if (uav.getStatus() == UavStatus.ASSIGNED
                || uav.getStatus() == UavStatus.IN_USE
                || missions.existsByUavIdAndStatusNotIn(uav.getId(), TERMINAL_MISSIONS)) {
            throw SystemException.conflict("UAV_HAS_ACTIVE_MISSION");
        }
    }

    private void checkExpectedStatus(Uav uav, UavStatus expectedStatus) {
        if (expectedStatus != null && uav.getStatus() != expectedStatus)
            throw SystemException.conflict("UAV_STATUS_CHANGED");
    }

    private String requireReason(String reason) {
        if (reason == null || reason.isBlank())
            throw SystemException.badRequest("UAV_STATUS_REASON_REQUIRED");
        String trimmed = reason.trim();
        if (trimmed.length() > 255) throw SystemException.badRequest("UAV_STATUS_REASON_TOO_LONG");
        return trimmed;
    }

    private void changeStatusInternal(Uav uav, UavStatus status, String reason, String actor) {
        UavStatus previous = uav.getStatus();
        uav.setStatus(status);
        history.save(new UavStatusHistory(uav, previous, status, reason, actor));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UavStatusHistoryResponse> history(Long id, Pageable pageable) {
        find(id);
        return PageResponse.from(
                history.findAll(
                        Specification.where(
                                com.uav.platform.modules.uav.specification
                                        .UavStatusHistorySpecifications.belongsToUav(id)),
                        pageable),
                uavMapper::toResponse);
    }

    private Uav find(Long id) {
        return repository.findById(id).orElseThrow(() -> SystemException.notFound("UAV not found"));
    }

    private Uav findForUpdate(Long id) {
        Uav uav =
                repository
                        .findByIdForUpdate(id)
                        .orElseThrow(() -> SystemException.notFound("UAV not found"));
        // A mission may have loaded this association before waiting for the lock.
        entityManager.refresh(uav);
        return uav;
    }
}
