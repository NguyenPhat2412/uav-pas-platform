package com.uav.platform.modules.uav.service;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.uav.common.*;

import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.config.request.UavRequest;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.uav.repository.UavStatusHistoryRepository;
import com.uav.platform.modules.uav.service.impl.IUavService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UavServiceTest {
    @Mock UavRepository repository;
    @Mock StationRepository stations;
    @Mock UavStatusHistoryRepository history;
    @Mock AuditLogService audit;
    @InjectMocks IUavService service;

    @Test
    void createStartsAvailableAndWritesHistory() {
        Uav uav = new Uav("Mavic", "SN-01", "Acme");
        uav.setId(1L);
        when(repository.existsBySerialNumber("SN-01")).thenReturn(false);
        when(repository.save(any(Uav.class))).thenReturn(uav);
        assertEquals("AVAILABLE", service.create(new UavRequest("Mavic", "SN-01", "Acme"), "admin").status().name());
        verify(history).save(any());
    }
}
