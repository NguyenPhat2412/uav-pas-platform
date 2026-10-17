package com.uav.platform.modules.maintenance.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.maintenance.dto.request.*;
import com.uav.platform.modules.maintenance.dto.response.*;
import com.uav.platform.modules.maintenance.entity.MaintenanceSchedule;
import com.uav.platform.modules.maintenance.entity.RepairMaterial;
import com.uav.platform.modules.maintenance.entity.RepairOrder;
import com.uav.platform.modules.maintenance.enums.DueStatus;
import com.uav.platform.modules.maintenance.enums.RepairStatus;
import com.uav.platform.modules.maintenance.mapper.MaintenanceMapper;
import com.uav.platform.modules.maintenance.repository.MaintenanceScheduleRepository;
import com.uav.platform.modules.maintenance.repository.RepairOrderRepository;
import com.uav.platform.modules.maintenance.service.MaintenanceService;
import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.entity.UavStatusHistory;
import com.uav.platform.modules.uav.enums.UavStatus;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.uav.repository.UavStatusHistoryRepository;
import com.uav.platform.modules.uav.service.impl.UavOperations;

import jakarta.persistence.EntityManager;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.EnumSet;

/** All writes take the UAV lock before schedule/order locks. No mission row is locked here. */
@Service
@Validated
@Transactional
@RequiredArgsConstructor
public class MaintenanceServiceImpl implements MaintenanceService {
    static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final EnumSet<RepairStatus> ACTIVE =
            EnumSet.of(RepairStatus.OPEN, RepairStatus.IN_PROGRESS);
    private static final EnumSet<MissionStatus> TERMINAL =
            EnumSet.of(
                    MissionStatus.COMPLETED,
                    MissionStatus.CANCELLED,
                    MissionStatus.REJECTED,
                    MissionStatus.FAILED);
    private final MaintenanceScheduleRepository schedules;
    private final RepairOrderRepository orders;
    private final UavRepository uavs;
    private final MissionRepository missions;
    private final UavStatusHistoryRepository history;
    private final AuditLogService audit;
    private final EntityManager em;
    private final MaintenanceMapper maintenanceMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MaintenanceScheduleResponse> schedules(
            Long uavId, DueStatus dueStatus, Pageable page) {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        Specification<MaintenanceSchedule> spec =
                (r, q, b) -> {
                    var p = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
                    if (uavId != null) p.add(b.equal(r.get("uav").get("id"), uavId));
                    if (dueStatus == DueStatus.PAUSED) p.add(b.isFalse(r.get("active")));
                    else if (dueStatus != null) {
                        p.add(b.isTrue(r.get("active")));
                        p.add(
                                switch (dueStatus) {
                                    case DUE -> b.equal(r.get("nextDueDate"), today);
                                    case OVERDUE -> b.lessThan(r.get("nextDueDate"), today);
                                    default -> b.greaterThan(r.get("nextDueDate"), today);
                                });
                    }
                    return b.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));
                };
        return PageResponse.from(
                schedules.findAll(spec, page), s -> maintenanceMapper.toScheduleResponse(s, today));
    }

    @Override
    public MaintenanceScheduleResponse createSchedule(
            CreateMaintenanceScheduleRequest r, String actor) {
        Uav uav = lockUav(r.uavId());
        var s =
                schedules.save(
                        MaintenanceScheduleOperations.create(
                                uav, r.title().trim(), r.intervalDays(), r.nextDueDate()));
        audit("MAINTENANCE_SCHEDULE", s.getId(), "CREATED", actor);
        em.flush();
        return scheduleResponse(s);
    }

    @Override
    public MaintenanceScheduleResponse updateSchedule(
            Long id, UpdateMaintenanceScheduleRequest r, String actor) {
        lockUav(
                schedules
                        .findUavId(id)
                        .orElseThrow(
                                () -> SystemException.notFound("MAINTENANCE_SCHEDULE_NOT_FOUND")));
        var s = lockSchedule(id);
        checkVersion(s.getVersion(), r.expectedVersion());
        if (orders.existsByScheduleIdAndStatusIn(id, ACTIVE))
            throw SystemException.conflict("MAINTENANCE_SCHEDULE_HAS_ACTIVE_ORDER");
        MaintenanceScheduleOperations.update(
                s, r.title().trim(), r.intervalDays(), r.nextDueDate(), r.active());
        audit("MAINTENANCE_SCHEDULE", id, r.active() ? "UPDATED" : "PAUSED", actor);
        em.flush();
        return scheduleResponse(s);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<RepairOrderResponse> orders(
            Long uavId, RepairStatus status, Pageable page) {
        Specification<RepairOrder> spec =
                (r, q, b) ->
                        b.and(
                                uavId == null
                                        ? b.conjunction()
                                        : b.equal(r.get("uav").get("id"), uavId),
                                status == null
                                        ? b.conjunction()
                                        : b.equal(r.get("status"), status));
        return PageResponse.from(orders.findAll(spec, page), maintenanceMapper::toOrderResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public RepairOrderResponse order(Long id) {
        return maintenanceMapper.toOrderResponse(
                orders.findById(id)
                        .orElseThrow(
                                () -> SystemException.notFound("MAINTENANCE_ORDER_NOT_FOUND")));
    }

    @Override
    public RepairOrderResponse createOrder(CreateRepairOrderRequest r, String actor) {
        Uav uav = lockUav(r.uavId());
        if (orders.existsByUavIdAndStatusIn(uav.getId(), ACTIVE))
            throw SystemException.conflict("MAINTENANCE_UAV_HAS_ACTIVE_ORDER");
        MaintenanceSchedule schedule = r.scheduleId() == null ? null : lockSchedule(r.scheduleId());
        if (schedule != null && !schedule.getUav().getId().equals(uav.getId()))
            throw SystemException.conflict("MAINTENANCE_SCHEDULE_UAV_MISMATCH");
        if (schedule != null && !schedule.isActive())
            throw SystemException.conflict("MAINTENANCE_SCHEDULE_PAUSED");
        var o =
                orders.save(
                        RepairOrderOperations.create(
                                uav,
                                schedule,
                                r.title().trim(),
                                trim(r.description()),
                                r.plannedDate(),
                                r.technicianName().trim()));
        audit("REPAIR_ORDER", o.getId(), "CREATED", actor);
        em.flush();
        return maintenanceMapper.toOrderResponse(o);
    }

    @Override
    public RepairOrderResponse updateOrder(Long id, UpdateRepairOrderRequest r, String actor) {
        var o = lockOrder(id);
        checkVersion(o.getVersion(), r.expectedVersion());
        requireEditable(o);
        RepairOrderOperations.update(
                o,
                r.title().trim(),
                trim(r.description()),
                r.plannedDate(),
                r.technicianName().trim());
        return finish(o, "UPDATED", actor);
    }

    @Override
    public RepairOrderResponse materials(Long id, UpdateRepairMaterialsRequest r, String actor) {
        var o = lockOrder(id);
        checkVersion(o.getVersion(), r.expectedVersion());
        requireEditable(o);
        RepairOrderOperations.replaceMaterials(
                o,
                r.items().stream()
                        .map(
                                m ->
                                        new RepairMaterial(
                                                o,
                                                m.name().trim(),
                                                m.unit().trim(),
                                                m.quantity(),
                                                m.unitPrice()))
                        .toList());
        return finish(
                o,
                "MATERIALS_UPDATED lines="
                        + r.items().size()
                        + " totalVND="
                        + RepairOrderOperations.totalMaterialCost(o).toPlainString(),
                actor);
    }

    @Override
    public RepairOrderResponse start(Long id, RepairOrderVersionRequest r, String actor) {
        var o = lockOrder(id);
        checkVersion(o.getVersion(), r.expectedVersion());
        requireStatus(o, RepairStatus.OPEN);
        Uav uav = o.getUav();
        requireIdle(uav);
        if (!EnumSet.of(UavStatus.AVAILABLE, UavStatus.INACTIVE, UavStatus.MAINTENANCE)
                .contains(uav.getStatus()))
            throw SystemException.conflict("UAV_HAS_ACTIVE_MISSION");
        UavStatus before = uav.getStatus();
        if (before != UavStatus.MAINTENANCE) UavOperations.markMaintenance(uav);
        RepairOrderOperations.start(o, LocalDateTime.now(BUSINESS_ZONE));
        history.save(
                new UavStatusHistory(
                        uav,
                        before,
                        UavStatus.MAINTENANCE,
                        "Repair order #" + id + " started",
                        actor));
        return finish(o, "STARTED", actor);
    }

    @Override
    public RepairOrderResponse complete(Long id, CompleteRepairOrderRequest r, String actor) {
        var o = lockOrder(id);
        checkVersion(o.getVersion(), r.expectedVersion());
        requireStatus(o, RepairStatus.IN_PROGRESS);
        Uav uav = o.getUav();
        requireIdle(uav);
        if (uav.getStatus() != UavStatus.MAINTENANCE)
            throw SystemException.conflict("MAINTENANCE_UAV_STATE_CHANGED");
        LocalDateTime now = LocalDateTime.now(BUSINESS_ZONE);
        RepairOrderOperations.complete(o, now, r.inspectionNotes().trim());
        uav.setStatus(UavStatus.AVAILABLE);
        history.save(
                new UavStatusHistory(
                        uav,
                        UavStatus.MAINTENANCE,
                        UavStatus.AVAILABLE,
                        "Repair order #" + id + " completed",
                        actor));
        if (o.getSchedule() != null) {
            var schedule = lockSchedule(o.getSchedule().getId());
            MaintenanceScheduleOperations.completedOn(schedule, now.toLocalDate());
            audit("MAINTENANCE_SCHEDULE", schedule.getId(), "ADVANCED order=" + id, actor);
        }
        return finish(o, "COMPLETED", actor);
    }

    @Override
    public RepairOrderResponse cancel(Long id, CancelRepairOrderRequest r, String actor) {
        var o = lockOrder(id);
        checkVersion(o.getVersion(), r.expectedVersion());
        requireEditable(o);
        // Cancellation deliberately never releases a UAV or removes recorded costs.
        RepairOrderOperations.cancel(o, LocalDateTime.now(BUSINESS_ZONE), r.reason().trim());
        return finish(o, "CANCELLED", actor);
    }

    private Uav lockUav(Long id) {
        Uav uav =
                uavs.findByIdForUpdate(id)
                        .orElseThrow(() -> SystemException.notFound("UAV_NOT_FOUND"));
        em.refresh(uav);
        return uav;
    }

    private MaintenanceSchedule lockSchedule(Long id) {
        var s =
                schedules
                        .findForUpdate(id)
                        .orElseThrow(
                                () -> SystemException.notFound("MAINTENANCE_SCHEDULE_NOT_FOUND"));
        em.refresh(s);
        return s;
    }

    private RepairOrder lockOrder(Long id) {
        lockUav(
                orders.findUavId(id)
                        .orElseThrow(
                                () -> SystemException.notFound("MAINTENANCE_ORDER_NOT_FOUND")));
        var o =
                orders.findForUpdate(id)
                        .orElseThrow(() -> SystemException.notFound("MAINTENANCE_ORDER_NOT_FOUND"));
        em.refresh(o);
        return o;
    }

    private void requireIdle(Uav uav) {
        if (uav.getStatus() == UavStatus.ASSIGNED
                || uav.getStatus() == UavStatus.IN_USE
                || missions.existsByUavIdAndStatusNotIn(uav.getId(), TERMINAL))
            throw SystemException.conflict("UAV_HAS_ACTIVE_MISSION");
    }

    private void checkVersion(long version, Long expected) {
        if (expected == null || expected != version)
            throw SystemException.conflict("MAINTENANCE_VERSION_CHANGED");
    }

    private void requireEditable(RepairOrder o) {
        if (!ACTIVE.contains(o.getStatus()))
            throw SystemException.conflict("MAINTENANCE_ORDER_TERMINAL");
    }

    private void requireStatus(RepairOrder o, RepairStatus status) {
        if (o.getStatus() != status)
            throw SystemException.conflict("MAINTENANCE_ORDER_INVALID_STATE");
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private MaintenanceScheduleResponse scheduleResponse(MaintenanceSchedule s) {
        return maintenanceMapper.toScheduleResponse(s, LocalDate.now(BUSINESS_ZONE));
    }

    private void audit(String type, Long id, String action, String actor) {
        audit.record(null, actor, AuditAction.UPDATE, type, id.toString(), action);
    }

    private RepairOrderResponse finish(RepairOrder o, String action, String actor) {
        audit("REPAIR_ORDER", o.getId(), action, actor);
        em.flush();
        return maintenanceMapper.toOrderResponse(o);
    }
}
