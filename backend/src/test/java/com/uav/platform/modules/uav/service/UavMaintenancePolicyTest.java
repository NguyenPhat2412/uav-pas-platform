package com.uav.platform.modules.uav.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.enums.StationStatus;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.station.service.impl.StationOperations;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.entity.UavStatusHistory;
import com.uav.platform.modules.uav.enums.UavStatus;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.uav.repository.UavStatusHistoryRepository;
import com.uav.platform.modules.uav.service.impl.UavOperations;
import com.uav.platform.modules.uav.service.impl.UavServiceImpl;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class UavMaintenancePolicyTest {
    @Mock UavRepository repository;
    @Mock StationRepository stations;
    @Mock UavStatusHistoryRepository history;
    @Mock AuditLogService audit;
    @Mock MissionRepository missions;
    @Mock EntityManager entityManager;
    @Mock com.uav.platform.modules.maintenance.repository.RepairOrderRepository repairOrders;

    @org.mockito.Spy
    com.uav.platform.modules.uav.mapper.UavMapper mapper =
            org.mapstruct.factory.Mappers.getMapper(
                    com.uav.platform.modules.uav.mapper.UavMapper.class);

    @InjectMocks UavServiceImpl service;
    private Uav uav;

    @BeforeEach
    void setUp() {
        uav = new Uav("Maintenance UAV", "MAINT-01", "Test");
        uav.setId(1L);
        lenient().when(repository.findById(1L)).thenReturn(Optional.of(uav));
        lenient().when(repository.findByIdForUpdate(1L)).thenReturn(Optional.of(uav));
    }

    @Test
    void assigningHomeStationKeepsIdleUavAvailableForMission() {
        Station station =
                StationOperations.create("HOME", "Home", null, null, null, StationStatus.ACTIVE);
        station.setId(2L);
        when(stations.findById(2L)).thenReturn(Optional.of(station));
        assertEquals(UavStatus.AVAILABLE, service.assign(1L, 2L, "manager").status());
        assertEquals(station, uav.getStation());
    }

    @Test
    void assignedUavCannotEnterMaintenance() {
        uav.setStatus(UavStatus.ASSIGNED);
        assertThrows(SystemException.class, () -> service.maintenance(1L, "manager"));
        assertEquals(UavStatus.ASSIGNED, uav.getStatus());
        verifyNoInteractions(history, audit);
    }

    @Test
    void flyingUavCannotEnterMaintenance() {
        uav.setStatus(UavStatus.IN_USE);
        assertThrows(SystemException.class, () -> service.maintenance(1L, "manager"));
        assertEquals(UavStatus.IN_USE, uav.getStatus());
        verifyNoInteractions(history, audit);
    }

    @Test
    void manualStatusCannotManufactureMissionAssignment() {
        assertThrows(
                SystemException.class,
                () -> service.changeStatus(1L, UavStatus.ASSIGNED, "Manual override", "manager"));
        assertEquals(UavStatus.AVAILABLE, uav.getStatus());
        verifyNoInteractions(history, audit);
    }

    @Test
    void manualStatusCannotReleaseFlyingUav() {
        uav.setStatus(UavStatus.IN_USE);
        assertThrows(
                SystemException.class,
                () -> service.changeStatus(1L, UavStatus.AVAILABLE, "Manual override", "manager"));
        assertEquals(UavStatus.IN_USE, uav.getStatus());
        verifyNoInteractions(history, audit);
    }

    @Test
    void returningFromMaintenanceRequiresInspectionReason() {
        UavOperations.markMaintenance(uav);
        assertThrows(
                SystemException.class,
                () -> service.changeStatus(1L, UavStatus.AVAILABLE, "  ", "manager"));
        assertEquals(UavStatus.MAINTENANCE, uav.getStatus());
        verifyNoInteractions(history, audit);
    }

    @Test
    void statusReasonCannotExceedPersistedHistoryCapacity() {
        assertThrows(
                SystemException.class,
                () -> service.changeStatus(1L, UavStatus.INACTIVE, "x".repeat(256), "manager"));
        assertEquals(UavStatus.AVAILABLE, uav.getStatus());
        verifyNoInteractions(history, audit);
    }

    @Test
    void repeatedMaintenanceDoesNotRewriteMaintenanceTimestamp() {
        UavOperations.markMaintenance(uav);
        var before = uav.getLastMaintenanceAt();
        assertThrows(SystemException.class, () -> service.maintenance(1L, "manager"));
        assertEquals(before, uav.getLastMaintenanceAt());
        verifyNoInteractions(history, audit);
    }

    @Test
    void activeMissionBlocksMaintenanceEvenWhenStoredStatusIsIncorrectlyAvailable() {
        when(missions.existsByUavIdAndStatusNotIn(eq(1L), any())).thenReturn(true);
        assertEquals(
                "UAV_HAS_ACTIVE_MISSION",
                assertThrows(
                                SystemException.class,
                                () ->
                                        service.maintenance(
                                                1L, "Inspection", UavStatus.AVAILABLE, "manager"))
                        .getCode());
        assertEquals(UavStatus.AVAILABLE, uav.getStatus());
        verifyNoInteractions(history, audit);
    }

    @Test
    void staleExpectedStatusDoesNotChangeHistoryOrStatus() {
        UavOperations.markMaintenance(uav);
        assertEquals(
                "UAV_STATUS_CHANGED",
                assertThrows(
                                SystemException.class,
                                () ->
                                        service.changeStatus(
                                                1L,
                                                UavStatus.INACTIVE,
                                                "Retire",
                                                UavStatus.AVAILABLE,
                                                "manager"))
                        .getCode());
        assertEquals(UavStatus.MAINTENANCE, uav.getStatus());
        verifyNoInteractions(history, audit);
    }

    @Test
    void maintenanceEntryAndCompletionRecordActorAndTrimmedReasons() {
        assertEquals(
                UavStatus.MAINTENANCE,
                service.maintenance(1L, "  Inspect motors  ", UavStatus.AVAILABLE, "manager")
                        .status());
        assertNotNull(uav.getLastMaintenanceAt());
        assertEquals(
                UavStatus.AVAILABLE,
                service.changeStatus(
                                1L,
                                UavStatus.AVAILABLE,
                                "  Inspection passed  ",
                                UavStatus.MAINTENANCE,
                                "inspector")
                        .status());
        var events = ArgumentCaptor.forClass(UavStatusHistory.class);
        verify(history, times(2)).save(events.capture());
        assertEquals("Inspect motors", events.getAllValues().get(0).getReason());
        assertEquals("manager", events.getAllValues().get(0).getChangedBy());
        assertEquals("Inspection passed", events.getAllValues().get(1).getReason());
        assertEquals("inspector", events.getAllValues().get(1).getChangedBy());
        assertEquals(UavStatus.MAINTENANCE, events.getAllValues().get(1).getFromStatus());
    }

    @Test
    void genericMaintenanceEndpointUsesSameTimestampAndReasonPolicy() {
        service.changeStatus(1L, UavStatus.MAINTENANCE, "Maintenance via status", "manager");
        assertNotNull(uav.getLastMaintenanceAt());
        assertEquals(UavStatus.MAINTENANCE, uav.getStatus());
        assertThrows(
                SystemException.class,
                () -> service.changeStatus(1L, UavStatus.MAINTENANCE, "Repeat", "manager"));
        verify(history, times(1)).save(any());
    }

    @Test
    void inactiveStationCannotReceiveAvailableUav() {
        Station station =
                StationOperations.create(
                        "CLOSED", "Closed", null, null, null, StationStatus.INACTIVE);
        when(stations.findById(2L)).thenReturn(Optional.of(station));
        assertEquals(
                "STATION_NOT_ACTIVE",
                assertThrows(SystemException.class, () -> service.assign(1L, 2L, "manager"))
                        .getCode());
        assertNull(uav.getStation());
        verifyNoInteractions(history, audit);
    }

    @Test
    void maintenanceUavCannotMoveToAnotherStation() {
        UavOperations.markMaintenance(uav);
        assertThrows(SystemException.class, () -> service.assign(1L, 2L, "manager"));
        verifyNoInteractions(stations, history, audit);
    }

    @Test
    void missionLifecycleUsesSeparateInternalCommand() {
        assertEquals(
                UavStatus.ASSIGNED,
                service.changeMissionStatus(1L, UavStatus.ASSIGNED, "Reserved", "dispatcher")
                        .status());
        assertEquals(
                UavStatus.IN_USE,
                service.changeMissionStatus(1L, UavStatus.IN_USE, "Started", "operator").status());
        assertEquals(
                UavStatus.AVAILABLE,
                service.changeMissionStatus(1L, UavStatus.AVAILABLE, "Released", "operator")
                        .status());
        assertThrows(
                SystemException.class,
                () ->
                        service.changeMissionStatus(
                                1L, UavStatus.IN_USE, "Skip reservation", "operator"));
        verify(history, times(3)).save(any());
    }

    @Test
    void orphanAssignmentRecoveryRequiresExplicitExpectedStatusAndReason() {
        uav.setStatus(UavStatus.ASSIGNED);
        assertThrows(
                SystemException.class,
                () ->
                        service.changeStatus(
                                1L,
                                UavStatus.AVAILABLE,
                                "Recover legacy home assignment",
                                "manager"));
        assertThrows(
                SystemException.class,
                () ->
                        service.changeStatus(
                                1L, UavStatus.AVAILABLE, " ", UavStatus.ASSIGNED, "manager"));
        assertEquals(UavStatus.ASSIGNED, uav.getStatus());
        assertEquals(
                UavStatus.AVAILABLE,
                service.changeStatus(
                                1L,
                                UavStatus.AVAILABLE,
                                "Recover legacy home assignment",
                                UavStatus.ASSIGNED,
                                "manager")
                        .status());
        verify(history, times(1)).save(any());
    }

    @Test
    void orphanRecoveryNeverReleasesAnActualMissionAssignment() {
        uav.setStatus(UavStatus.ASSIGNED);
        when(missions.existsByUavIdAndStatusNotIn(eq(1L), any())).thenReturn(true);
        assertEquals(
                "UAV_HAS_ACTIVE_MISSION",
                assertThrows(
                                SystemException.class,
                                () ->
                                        service.changeStatus(
                                                1L,
                                                UavStatus.AVAILABLE,
                                                "Try recovery",
                                                UavStatus.ASSIGNED,
                                                "manager"))
                        .getCode());
        assertEquals(UavStatus.ASSIGNED, uav.getStatus());
        verifyNoInteractions(history, audit);
    }
}
