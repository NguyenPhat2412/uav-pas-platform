package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dao.IEquipmentDao;
import com.uav.platform.dao.IInventoryMovementDao;
import com.uav.platform.dao.IMissionEquipmentReservationDao;
import com.uav.platform.dao.IStationDao;
import com.uav.platform.dto.request.EquipmentRequest;
import com.uav.platform.dto.request.QuantityRequest;
import com.uav.platform.dto.response.EquipmentResponse;
import com.uav.platform.dto.response.InventoryMovementResponse;
import com.uav.platform.entity.Equipment;
import com.uav.platform.entity.InventoryMovement;
import com.uav.platform.entity.Station;
import com.uav.platform.enums.AuditAction;
import com.uav.platform.enums.EquipmentStatus;
import com.uav.platform.enums.EquipmentType;
import com.uav.platform.enums.MovementType;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.EquipmentMapper;
import com.uav.platform.mapper.InventoryMovementMapper;
import com.uav.platform.service.AuditLogService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class InventoryServiceImplCoverageTest {

    @Mock private IEquipmentDao equipment;
    @Mock private IInventoryMovementDao movements;
    @Mock private IStationDao stations;
    @Mock private AuditLogService audit;
    @Mock private EquipmentMapper equipmentMapper;
    @Mock private InventoryMovementMapper movementMapper;
    @Mock private IMissionEquipmentReservationDao missionReservations;
    @Mock private JdbcTemplate requestJdbc;

    private InventoryServiceImpl service;

    @BeforeEach
    void setUp() {
        service =
                new InventoryServiceImpl(
                        equipment, movements, stations, audit, equipmentMapper, movementMapper);
        ReflectionTestUtils.setField(service, "missionReservations", missionReservations);
        ReflectionTestUtils.setField(service, "requestJdbc", requestJdbc);
    }

    private Station station(Long id, String code) {
        Station s = new Station();
        s.setId(id);
        s.setCode(code);
        s.setName("Station " + code);
        return s;
    }

    private Equipment equipmentEntity(
            Long id, String serial, int qty, int avail, int res, Station st) {
        Equipment e = new Equipment("Battery Pack", EquipmentType.BATTERY, serial, st);
        e.setId(id);
        e.setQuantity(qty);
        e.setAvailableQuantity(avail);
        e.setReservedQuantity(res);
        e.setStatus(EquipmentStatus.ACTIVE);
        return e;
    }

    @Test
    void listGetAndHistoryDelegateToDaos() {
        Equipment e = equipmentEntity(1L, "SN-1", 5, 5, 0, null);
        EquipmentResponse resp = mock(EquipmentResponse.class);
        when(equipment.findAll(PageRequest.of(0, 10))).thenReturn(new PageImpl<>(List.of(e)));
        when(equipmentMapper.toResponse(e)).thenReturn(resp);
        PageResponse<EquipmentResponse> page = service.list(PageRequest.of(0, 10));
        assertEquals(1, page.content().size());

        when(equipment.findById(1L)).thenReturn(Optional.of(e));
        assertSame(resp, service.get(1L));

        when(equipment.findById(99L)).thenReturn(Optional.empty());
        assertThrows(SystemException.class, () -> service.get(99L));

        InventoryMovement mv =
                new InventoryMovement(e, MovementType.STOCK_IN, 5, null, null, "admin", "init");
        InventoryMovementResponse mvResp = mock(InventoryMovementResponse.class);
        when(movements.findAll(PageRequest.of(0, 5))).thenReturn(new PageImpl<>(List.of(mv)));
        when(movementMapper.toResponse(mv)).thenReturn(mvResp);
        assertEquals(1, service.history(PageRequest.of(0, 5)).content().size());
    }

    @Test
    void createHandlesDuplicateSerialStationAndNoStation() {
        EquipmentRequest dup = new EquipmentRequest("Cam", EquipmentType.CAMERA, "SN-DUP", null);
        when(equipment.existsBySerialNumber("SN-DUP")).thenReturn(true);
        assertThrows(SystemException.class, () -> service.create(dup, "admin"));

        Station s1 = station(1L, "HN");
        EquipmentRequest withStation =
                new EquipmentRequest("Cam", EquipmentType.CAMERA, "SN-NEW", 1L);
        when(equipment.existsBySerialNumber("SN-NEW")).thenReturn(false);
        when(stations.findById(1L)).thenReturn(Optional.of(s1));
        when(equipment.save(any(Equipment.class)))
                .thenAnswer(
                        inv -> {
                            Equipment saved = inv.getArgument(0);
                            saved.setId(42L);
                            return saved;
                        });
        EquipmentResponse resp = mock(EquipmentResponse.class);
        when(equipmentMapper.toResponse(any(Equipment.class))).thenReturn(resp);

        assertSame(resp, service.create(withStation, "admin"));
        verify(audit).record(null, "admin", AuditAction.CREATE, "EQUIPMENT", "42", "Cam");

        EquipmentRequest blankSerialNoStation =
                new EquipmentRequest("Cable", EquipmentType.ACCESSORY, "  ", null);
        assertSame(resp, service.create(blankSerialNoStation, "admin"));
    }

    @Test
    void updateBlocksStationChangeWhenReservedAndAllowsOtherwise() {
        Station s1 = station(1L, "HN");
        Station s2 = station(2L, "HCM");
        Equipment reserved = equipmentEntity(10L, null, 5, 3, 2, s1);
        when(equipment.findByIdForUpdate(10L)).thenReturn(Optional.of(reserved));

        EquipmentRequest moveWhileReserved =
                new EquipmentRequest("Battery", EquipmentType.BATTERY, null, 2L);
        assertThrows(SystemException.class, () -> service.update(10L, moveWhileReserved, "admin"));

        // Same station while reserved succeeds
        EquipmentRequest sameStation =
                new EquipmentRequest("Battery Renamed", EquipmentType.BATTERY, null, 1L);
        when(stations.findById(1L)).thenReturn(Optional.of(s1));
        EquipmentResponse resp = mock(EquipmentResponse.class);
        when(equipmentMapper.toResponse(reserved)).thenReturn(resp);
        assertSame(resp, service.update(10L, sameStation, "admin"));
        verify(audit)
                .record(null, "admin", AuditAction.UPDATE, "EQUIPMENT", "10", "Battery Renamed");

        // Unreserved item moving to null station succeeds
        Equipment unreserved = equipmentEntity(11L, null, 5, 5, 0, s1);
        when(equipment.findByIdForUpdate(11L)).thenReturn(Optional.of(unreserved));
        when(equipmentMapper.toResponse(unreserved)).thenReturn(resp);
        assertSame(
                resp,
                service.update(
                        11L,
                        new EquipmentRequest("Sensor", EquipmentType.SENSOR, null, null),
                        "op"));
        assertNull(unreserved.getStation());

        // Move to different station when unreserved
        when(stations.findById(2L)).thenReturn(Optional.of(s2));
        assertSame(
                resp,
                service.update(
                        11L, new EquipmentRequest("Sensor", EquipmentType.SENSOR, null, 2L), "op"));
        assertSame(s2, unreserved.getStation());
    }

    @Test
    void movementsCoverStockInOutReserveReleaseInactiveMissionGuardAndIdempotency() {
        Station s1 = station(1L, "HN");
        Equipment item = equipmentEntity(20L, null, 10, 8, 2, s1);
        EquipmentResponse resp = mock(EquipmentResponse.class);
        when(equipment.findByIdForUpdate(20L)).thenReturn(Optional.of(item));
        when(equipmentMapper.toResponse(item)).thenReturn(resp);

        // Lock request via JdbcTemplate + idempotent replay hit
        InventoryMovement existing =
                new InventoryMovement(
                        item, MovementType.STOCK_IN, 5, s1, s1, "admin", "note1", "req-1");
        when(movements.findByRequestId("req-1")).thenReturn(Optional.of(existing));
        assertSame(resp, service.stockIn(20L, new QuantityRequest(5, "note1", "req-1"), "admin"));
        verify(requestJdbc)
                .queryForObject(
                        "SELECT id FROM inventory_request_guard WHERE id=1 FOR UPDATE", Long.class);

        // Idempotent replay conflict (different quantity)
        assertThrows(
                SystemException.class,
                () -> service.stockIn(20L, new QuantityRequest(6, "note1", "req-1"), "admin"));

        // Reserve inactive item fails
        item.setStatus(EquipmentStatus.INACTIVE);
        assertThrows(
                SystemException.class,
                () -> service.reserve(20L, new QuantityRequest(1, "need", null), "admin"));

        // Active reserve succeeds
        item.setStatus(EquipmentStatus.ACTIVE);
        assertSame(resp, service.reserve(20L, new QuantityRequest(2, "ok", null), "admin"));
        assertEquals(4, item.getReservedQuantity());

        // Release blocked by active mission reservation
        when(missionReservations.activeQuantity(20L)).thenReturn(3L);
        assertThrows(
                SystemException.class,
                () -> service.release(20L, new QuantityRequest(2, "rel", null), "admin"));

        // Release within non-mission reserved amount succeeds
        assertSame(resp, service.release(20L, new QuantityRequest(1, "rel", null), "admin"));
        assertEquals(3, item.getReservedQuantity());

        // Stock out succeeds
        assertSame(resp, service.stockOut(20L, new QuantityRequest(2, "out", null), "admin"));
        assertEquals(8, item.getQuantity());
    }

    @Test
    void transferCoversWholePartialSerializedSameStationInsufficientAndReplay() {
        Station s1 = station(1L, "HN");
        Station s2 = station(2L, "HCM");

        Equipment serialized = equipmentEntity(30L, "SER-30", 2, 2, 0, s1);
        EquipmentResponse resp = mock(EquipmentResponse.class);
        when(equipment.findByIdForUpdate(30L)).thenReturn(Optional.of(serialized));
        when(stations.findById(1L)).thenReturn(Optional.of(s1));
        when(stations.findById(2L)).thenReturn(Optional.of(s2));
        when(equipmentMapper.toResponse(serialized)).thenReturn(resp);

        // Same station -> badRequest
        assertThrows(
                SystemException.class,
                () -> service.transfer(30L, 1L, new QuantityRequest(1, "move", null), "admin"));

        // Insufficient available -> conflict
        assertThrows(
                SystemException.class,
                () -> service.transfer(30L, 2L, new QuantityRequest(5, "move", null), "admin"));

        // Serialized partial -> conflict
        assertThrows(
                SystemException.class,
                () -> service.transfer(30L, 2L, new QuantityRequest(1, "move", null), "admin"));

        // Whole transfer -> updates station in place
        assertSame(resp, service.transfer(30L, 2L, new QuantityRequest(2, "all", "tr-1"), "admin"));
        assertSame(s2, serialized.getStation());

        // Transfer replay with mismatched target station -> conflict
        InventoryMovement priorTransfer =
                new InventoryMovement(
                        serialized, MovementType.TRANSFER, 2, s1, s2, "admin", "all", "tr-1");
        when(movements.findByRequestId("tr-1")).thenReturn(Optional.of(priorTransfer));
        assertThrows(
                SystemException.class,
                () -> service.transfer(30L, 1L, new QuantityRequest(2, "all", "tr-1"), "admin"));
        // Transfer replay matching target station -> returns response
        assertSame(resp, service.transfer(30L, 2L, new QuantityRequest(2, "all", "tr-1"), "admin"));

        // Partial transfer of non-serialized creates destination equipment
        Equipment bulk = equipmentEntity(31L, null, 10, 10, 0, s1);
        when(equipment.findByIdForUpdate(31L)).thenReturn(Optional.of(bulk));
        when(equipmentMapper.toResponse(bulk)).thenReturn(resp);
        assertSame(resp, service.transfer(31L, 2L, new QuantityRequest(4, "split", null), "admin"));
        assertEquals(6, bulk.getQuantity());
        verify(equipment).save(any(Equipment.class));

        // Missing station throws notFound
        when(stations.findById(999L)).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () -> service.transfer(31L, 999L, new QuantityRequest(1, null, null), "admin"));
        verify(audit, atLeastOnce())
                .record(
                        eq(null),
                        eq("admin"),
                        eq(AuditAction.TRANSFER),
                        eq("EQUIPMENT"),
                        any(),
                        any());
    }
}
