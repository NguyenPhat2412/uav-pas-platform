package com.uav.platform.modules.station.service;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.station.common.*;

import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.station.config.request.StationRequest;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.station.service.impl.IStationService;
import com.uav.platform.error.SystemException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StationServiceTest {
    @Mock StationRepository repository;
    @Mock AuditLogService audit;
    @InjectMocks IStationService service;

    @Test
    void createPersistsStationAndRecordsAudit() {
        Station station = new Station("ST-01", "North", "Address", 21.0, 105.0, null);
        station.setId(1L);
        when(repository.existsByCode("ST-01")).thenReturn(false);
        when(repository.save(any(Station.class))).thenReturn(station);

        assertEquals("ST-01", service.create(new StationRequest("ST-01", "North", "Address", 21.0, 105.0, null), "admin").code());
        verify(audit).record(null, "admin", com.uav.platform.modules.audit.common.AuditAction.CREATE, "STATION", "1", "ST-01");
    }

    @Test
    void duplicateCodeIsRejected() {
        when(repository.existsByCode("ST-01")).thenReturn(true);
        assertThrows(SystemException.class, () -> service.create(new StationRequest("ST-01", "North", null, null, null, null), "admin"));
        verify(repository, never()).save(any());
    }
}
