package com.uav.platform.service.station;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.station.StationRequest;
import com.uav.platform.entity.station.Station;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.station.StationOperations;
import com.uav.platform.service.impl.station.StationServiceImpl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StationServiceTest {
    @Mock StationRepository repository;
    @Mock AuditLogService audit;

    @org.mockito.Spy
    com.uav.platform.mapper.station.StationMapper mapper =
            org.mapstruct.factory.Mappers.getMapper(
                    com.uav.platform.mapper.station.StationMapper.class);

    @InjectMocks StationServiceImpl service;

    @Test
    void createPersistsStationAndRecordsAudit() {
        Station station = StationOperations.create("ST-01", "North", "Address", 21.0, 105.0, null);
        station.setId(1L);
        when(repository.existsByCode("ST-01")).thenReturn(false);
        when(repository.save(any(Station.class))).thenReturn(station);

        assertEquals(
                "ST-01",
                service.create(
                                new StationRequest(
                                        "ST-01", "North", "Address", 21.0, 105.0, null, null),
                                "admin")
                        .code());
        verify(audit)
                .record(
                        null,
                        "admin",
                        com.uav.platform.enums.audit.AuditAction.CREATE,
                        "STATION",
                        "1",
                        "ST-01");
    }

    @Test
    void duplicateCodeIsRejected() {
        when(repository.existsByCode("ST-01")).thenReturn(true);
        assertThrows(
                SystemException.class,
                () ->
                        service.create(
                                new StationRequest("ST-01", "North", null, null, null, null, null),
                                "admin"));
        verify(repository, never()).save(any());
    }

    @Test
    void deletingAStationWithHistoryDeactivatesItInstead() {
        Station station = StationOperations.create("ST-01", "North", null, null, null, null);
        station.setId(1L);
        when(repository.findById(1L)).thenReturn(java.util.Optional.of(station));
        when(repository.hasReferences(1L)).thenReturn(true);

        var kept = service.delete(1L, "admin");

        assertEquals(StationStatus.INACTIVE, kept.orElseThrow().status());
        verify(repository, never()).delete(any(Station.class));
        verify(audit)
                .record(
                        null,
                        "admin",
                        AuditAction.STATUS_CHANGE,
                        "STATION",
                        "1",
                        "ACTIVE -> INACTIVE");
    }

    @Test
    void deletingAnUnusedStationRemovesIt() {
        Station station = StationOperations.create("ST-02", "South", null, null, null, null);
        station.setId(2L);
        when(repository.findById(2L)).thenReturn(java.util.Optional.of(station));
        when(repository.hasReferences(2L)).thenReturn(false);

        assertEquals(java.util.Optional.empty(), service.delete(2L, "admin"));
        verify(repository).delete(station);
        verify(audit).record(null, "admin", AuditAction.DELETE, "STATION", "2", "ST-02");
    }

    @Test
    void editingNeverChangesTheStatus() {
        Station station =
                StationOperations.create(
                        "ST-03", "East", null, null, null, StationStatus.MAINTENANCE);
        station.setId(3L);
        when(repository.findById(3L)).thenReturn(java.util.Optional.of(station));

        var saved =
                service.update(
                        3L,
                        new StationRequest(
                                "ST-03", "East", null, null, null, StationStatus.ACTIVE, "Notes"),
                        "admin");

        assertEquals(StationStatus.MAINTENANCE, saved.status());
        assertEquals("Notes", saved.description());
    }

    @Test
    void statusChangeIsAuditedOnlyWhenItChanges() {
        Station station = StationOperations.create("ST-04", "West", null, null, null, null);
        station.setId(4L);
        when(repository.findById(4L)).thenReturn(java.util.Optional.of(station));

        service.updateStatus(4L, StationStatus.ACTIVE, "admin");
        verify(audit, never()).record(any(), any(), any(), any(), any(), any());

        assertEquals(
                StationStatus.MAINTENANCE,
                service.updateStatus(4L, StationStatus.MAINTENANCE, "admin").status());
        verify(audit)
                .record(
                        null,
                        "admin",
                        AuditAction.STATUS_CHANGE,
                        "STATION",
                        "4",
                        "ACTIVE -> MAINTENANCE");
    }
}
