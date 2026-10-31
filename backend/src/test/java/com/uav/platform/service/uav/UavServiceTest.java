package com.uav.platform.service.uav;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.uav.UavRequest;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.uav.UavStatusHistoryRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.uav.UavServiceImpl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UavServiceTest {
    @Mock UavRepository repository;
    @Mock StationRepository stations;
    @Mock UavStatusHistoryRepository history;
    @Mock AuditLogService audit;

    @org.mockito.Spy
    com.uav.platform.mapper.uav.UavMapper mapper =
            org.mapstruct.factory.Mappers.getMapper(com.uav.platform.mapper.uav.UavMapper.class);

    @InjectMocks UavServiceImpl service;

    @Test
    void createStartsAvailableAndWritesHistory() {
        Uav uav = new Uav("Mavic", "SN-01", "Acme");
        uav.setId(1L);
        when(repository.existsBySerialNumber("SN-01")).thenReturn(false);
        when(repository.save(any(Uav.class))).thenReturn(uav);
        assertEquals(
                "AVAILABLE",
                service.create(new UavRequest("Mavic", "SN-01", "Acme"), "admin").status().name());
        verify(history).save(any());
    }
}
