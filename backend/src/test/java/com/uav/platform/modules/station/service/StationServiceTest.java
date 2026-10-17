package com.uav.platform.modules.station.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.dto.request.StationRequest;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.station.service.impl.StationOperations;
import com.uav.platform.modules.station.service.impl.StationServiceImpl;
import com.uav.platform.modules.uav.enums.*;

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
    com.uav.platform.modules.station.mapper.StationMapper mapper =
            org.mapstruct.factory.Mappers.getMapper(
                    com.uav.platform.modules.station.mapper.StationMapper.class);

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
                                new StationRequest("ST-01", "North", "Address", 21.0, 105.0, null),
                                "admin")
                        .code());
        verify(audit)
                .record(
                        null,
                        "admin",
                        com.uav.platform.modules.audit.enums.AuditAction.CREATE,
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
                                new StationRequest("ST-01", "North", null, null, null, null),
                                "admin"));
        verify(repository, never()).save(any());
    }
}
