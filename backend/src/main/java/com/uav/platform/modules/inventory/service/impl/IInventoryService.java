package com.uav.platform.modules.inventory.service.impl;

import com.uav.platform.modules.inventory.mapper.EquipmentMapper;
import com.uav.platform.modules.inventory.mapper.InventoryMovementMapper;

import com.uav.platform.modules.inventory.common.*;

import com.uav.platform.modules.audit.common.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.inventory.config.request.*;
import com.uav.platform.modules.inventory.config.response.*;
import com.uav.platform.modules.inventory.entity.*;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.repository.InventoryMovementRepository;
import com.uav.platform.modules.inventory.service.InventoryService;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.repository.StationRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class IInventoryService implements InventoryService {
    @org.springframework.beans.factory.annotation.Autowired
    private com.uav.platform.modules.mission.repository.MissionEquipmentReservationRepository missionReservations;
    private final EquipmentRepository equipment;
    private final InventoryMovementRepository movements;
    private final StationRepository stations;
    private final AuditLogService audit;
    public IInventoryService(EquipmentRepository equipment, InventoryMovementRepository movements, StationRepository stations, AuditLogService audit) {
        this.equipment = equipment; this.movements = movements; this.stations = stations; this.audit = audit;
    }
    @Override @Transactional(readOnly = true)
    public PageResponse<EquipmentResponse> list(Pageable pageable) { return PageResponse.from(equipment.findAll(pageable), EquipmentMapper::toResponse); }
    @Override @Transactional(readOnly = true)
    public EquipmentResponse get(Long id) { return EquipmentMapper.toResponse(find(id)); }
    @Override
    public EquipmentResponse create(EquipmentRequest request, String actor) {
        if (request.serialNumber() != null && !request.serialNumber().isBlank() && equipment.existsBySerialNumber(request.serialNumber())) throw SystemException.conflict("Equipment serial number already exists");
        Station station = request.stationId() == null ? null : station(request.stationId());
        Equipment saved = equipment.save(new Equipment(request.name(), request.type(), request.serialNumber(), station));
        audit.record(null, actor, AuditAction.CREATE, "EQUIPMENT", saved.getId().toString(), saved.getName());
        return EquipmentMapper.toResponse(saved);
    }
    @Override
    public EquipmentResponse update(Long id, EquipmentRequest request, String actor) {
        Equipment item = locked(id);
        Long currentStation = item.getStation() == null ? null : item.getStation().getId();
        if (!java.util.Objects.equals(currentStation, request.stationId()) && item.getReservedQuantity() > 0) throw SystemException.conflict("Equipment is reserved; release reservations before changing station");
        item.update(request.name(), request.type(), request.stationId() == null ? null : station(request.stationId()));
        audit.record(null, actor, AuditAction.UPDATE, "EQUIPMENT", id.toString(), item.getName());
        return EquipmentMapper.toResponse(item);
    }
    @Override public EquipmentResponse stockIn(Long id, QuantityRequest r, String actor) { return movement(id, r, actor, MovementType.STOCK_IN); }
    @Override public EquipmentResponse stockOut(Long id, QuantityRequest r, String actor) { return movement(id, r, actor, MovementType.STOCK_OUT); }
    @Override public EquipmentResponse reserve(Long id, QuantityRequest r, String actor) { return movement(id, r, actor, MovementType.RESERVE); }
    @Override public EquipmentResponse release(Long id, QuantityRequest r, String actor) { return movement(id, r, actor, MovementType.RELEASE); }
    @Override
    public EquipmentResponse transfer(Long id, Long stationId, QuantityRequest r, String actor) {
        Equipment item = locked(id);
        Station target = station(stationId);
        var replay = replay(item, r, actor, MovementType.TRANSFER, stationId);
        if (replay != null) return replay;
        Station from = item.getStation();
        if (from != null && from.getId().equals(target.getId())) throw SystemException.badRequest("Source and target stations must differ");
        if (r.quantity() <= 0 || r.quantity() > item.getAvailableQuantity()) throw SystemException.conflict("Insufficient available equipment");
        if (item.getSerialNumber() != null && !item.getSerialNumber().isBlank() && r.quantity() != item.getQuantity()) {
            throw SystemException.conflict("Serialized equipment must be transferred as a whole");
        }
        if (r.quantity() == item.getQuantity()) {
            item.setStation(target);
        } else {
            item.stockOut(r.quantity());
            Equipment destination = new Equipment(item.getName(), item.getType(), null, target);
            destination.stockIn(r.quantity());
            equipment.save(destination);
        }
        movements.save(new InventoryMovement(item, MovementType.TRANSFER, r.quantity(), from, target, actor, r.note(), r.requestId()));
        audit.record(null, actor, AuditAction.TRANSFER, "EQUIPMENT", id.toString(), target.getCode());
        return EquipmentMapper.toResponse(item);
    }
    @Override @Transactional(readOnly = true)
    public PageResponse<InventoryMovementResponse> history(Pageable pageable) {
        return PageResponse.from(movements.findAll(pageable), InventoryMovementMapper::toResponse);
    }
    private EquipmentResponse movement(Long id, QuantityRequest r, String actor, MovementType type) {
        Equipment item = locked(id);
        var replay = replay(item, r, actor, type, null);
        if (replay != null) return replay;
        long missionQuantity = type == MovementType.RELEASE && missionReservations != null ? missionReservations.activeQuantity(id) : 0;
        if (missionQuantity > 0 && item.getReservedQuantity() - missionQuantity < r.quantity()) {
            throw SystemException.conflict("MISSION_EQUIPMENT_RELEASE_REQUIRED");
        }
        if (type == MovementType.RESERVE && item.getStatus() != com.uav.platform.modules.inventory.common.EquipmentStatus.ACTIVE) throw SystemException.conflict("INVENTORY_NOT_AVAILABLE");
        switch (type) { case STOCK_IN -> item.stockIn(r.quantity()); case STOCK_OUT -> item.stockOut(r.quantity()); case RESERVE -> item.reserve(r.quantity()); case RELEASE -> item.release(r.quantity()); default -> throw new IllegalArgumentException("Unsupported movement"); }
        movements.save(new InventoryMovement(item, type, r.quantity(), item.getStation(), item.getStation(), actor, r.note(), r.requestId()));
        AuditAction action = switch (type) { case STOCK_IN -> AuditAction.STOCK_IN; case STOCK_OUT -> AuditAction.STOCK_OUT; case RESERVE -> AuditAction.RESERVE; default -> AuditAction.RELEASE; };
        audit.record(null, actor, action, "EQUIPMENT", id.toString(), String.valueOf(r.quantity()));
        return EquipmentMapper.toResponse(item);
    }
    private EquipmentResponse replay(Equipment item, QuantityRequest request, String actor, MovementType type, Long target) {
        if (request.requestId() == null || request.requestId().isBlank()) return null;
        return movements.findByRequestId(request.requestId()).map(existing -> {
            boolean sameTarget = type != MovementType.TRANSFER || (existing.getToStation() != null && existing.getToStation().getId().equals(target));
            if (!existing.getEquipment().getId().equals(item.getId()) || existing.getType() != type
                    || existing.getQuantity() != request.quantity() || !java.util.Objects.equals(existing.getActor(), actor)
                    || !java.util.Objects.equals(existing.getNote(), request.note()) || !sameTarget) {
                throw SystemException.conflict("Request ID already used with different operation or payload");
            }
            return EquipmentMapper.toResponse(item);
        }).orElse(null);
    }
    private Equipment locked(Long id) { return equipment.findByIdForUpdate(id).orElseThrow(() -> SystemException.notFound("Equipment not found")); }
    private Equipment find(Long id) { return equipment.findById(id).orElseThrow(() -> SystemException.notFound("Equipment not found")); }
    private Station station(Long id) { return stations.findById(id).orElseThrow(() -> SystemException.notFound("Station not found")); }
}
